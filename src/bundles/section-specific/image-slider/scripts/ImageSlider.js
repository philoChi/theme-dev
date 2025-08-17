/**
 * Image Slider Component
 * High-performance image slider with infinite scrolling and accessibility features
 * Works with any HTML element containing the required slider structure
 */
class ImageSlider {
  /**
   * Initialize the image slider component
   * @param {HTMLElement} sliderElement - The container element for the slider
   */
  constructor(sliderElement) {
    /**
     * Basic element references
     */
    this.slider = sliderElement
    this.sliderId = sliderElement.id || 'slider-' + Math.floor(Math.random() * 1000)
    this.container = sliderElement.querySelector('.image-slider__container')
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))

    /**
     * Debug helper (keeps existing ImageSliderLogger calls intact)
     * – If the logger doesn't exist we noop instead of branching every time.
     */
    this._logger = (typeof ImageSliderLogger !== 'undefined' && ImageSliderLogger.state)
      ? ImageSliderLogger.state.bind(ImageSliderLogger)
      : () => { }

    this._logger(`[Slider: ${this.sliderId}] Initializing with ${this.slides.length} slides`)

    // Find the index with aria-current="true" (if present)
    const activeIndex = this.slides.findIndex(s => s.getAttribute('aria-current') === 'true')

    // Desired logical index (real content slide at DOM position 1)
    this.currentIndex = 1

    // Move current active slide into DOM position 1 if required (unchanged logic)
    if (activeIndex !== -1 && activeIndex !== 1) {
      const activeSlide = this.slides[activeIndex]
      activeSlide.remove()
      this.container.insertBefore(activeSlide, this.container.children[1] || null)
      this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))
    }

    // Cache arrow buttons
    this.prevButton = sliderElement.querySelector('[data-arrow="prev"]')
    this.nextButton = sliderElement.querySelector('[data-arrow="next"]')

    /**
     * Autoplay / transition‑speed config (Theme‑Editor controlled)
     *  – data‑autoplay:       "true" | "false"
     *  – data‑interval:       milliseconds (e.g. 5000)
     */
    this.autoplayEnabled = sliderElement.dataset.autoplay === 'true'
    this.autoplayInterval = parseInt(sliderElement.dataset.interval || '5000', 10)
    this.autoplayTimer = null

    this.isTransitioning = false

    // Initialize the slider
    this.init()

    // Setup autoplay if enabled and user prefers motion
    if (this.autoplayEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.startAutoplay()

      // Pause on user interaction; resume afterwards
      const pause = () => this.stopAutoplay()
      const resume = () => this.startAutoplay()
      ;['mouseenter', 'focusin', 'touchstart'].forEach(e => sliderElement.addEventListener(e, pause, { passive: true }))
      ;['mouseleave', 'focusout', 'touchend'].forEach(e => sliderElement.addEventListener(e, resume, { passive: true }))
    }

    // Setup swipe support for touch devices
    this._setupSwipeEvents()
  }

  /**
   * Sets up swipe gesture support for touch devices
   * Adds lightweight horizontal swipe handling with pointer events
   */
  _setupSwipeEvents() {
    // Only run on touch/pen pointers to avoid redundant mouse handling
    const THRESHOLD = 40  // px – minimum horizontal movement
    let startX = null
    let startY = null

    const onPointerDown = (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
      startX = e.clientX
      startY = e.clientY
    }

    const onPointerUp = (e) => {
      if (startX === null) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      startX = startY = null

      // Trigger only if the gesture is mostly horizontal & beyond threshold
      if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        this.navigate(dx < 0 ? 'right' : 'left')  // same transition as arrow
      }
    }

    // Passive listeners keep scrolling fluid (touch‑action already set to pan‑y)
    this.slider.addEventListener('pointerdown', onPointerDown, { passive: true })
    this.slider.addEventListener('pointerup', onPointerUp, { passive: true })
    this.slider.addEventListener('pointercancel', onPointerUp, { passive: true })
  }

  /**
   * Initialize the slider component
   * Sets up positioning, event listeners, and initial state
   */
  init() {
    this.updateCentralSlidePositions()
    this.resetCopySlides()
    this.currentIndex += 1 // account for copy slide inserted at index 0
    this.updateOffsetSlidePositions()
    this.updateNextSlidePositions()

    // Arrow listeners – use passive option, no scrolling prevented
    this.prevButton.addEventListener('click', () => this.navigate('left'), { passive: true })
    this.nextButton.addEventListener('click', () => this.navigate('right'), { passive: true })

    // Wait for everything to be properly positioned before showing
    setTimeout(() => {
      this.container.style.opacity = '1'
      this._logger(`[Slider: ${this.sliderId}] Slides revealed after positioning`)
    }, 400) // Give enough time for all DOM manipulations to complete

    this._logger(`[Slider: ${this.sliderId}] Initialization complete`)
  }


  /**
   * Returns true for backwards compatibility – boundary checks no longer needed
   */
  getPreviousIndexValid() { return true }
  
  /**
   * Returns true for backwards compatibility – boundary checks no longer needed
   */
  getNextIndexValid() { return true }

  /**
   * Removes old copy slides and inserts fresh clones at both ends
   * This enables infinite scrolling by duplicating first/last slides
   */
  resetCopySlides() {
    const copys = this.container.querySelectorAll('[data-copy-slide]')
    copys.forEach(el => el.remove())

    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))
    const lastReal = this.slides[this.slides.length - 1].cloneNode(true)
    const firstReal = this.slides[0].cloneNode(true)

      ;[lastReal, firstReal].forEach(clone => {
        clone.dataset.copySlide = 'true'
        clone.removeAttribute('data-slide-position')
        clone.removeAttribute('aria-current')
      })

    lastReal.dataset.slidePosition = 'offscreen-left'
    firstReal.dataset.slidePosition = 'offscreen-right'

    this.container.prepend(lastReal)
    this.container.append(firstReal)

    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))
  }

  /**
   * Updates the central, left, and right slide positions using ARIA and data attributes
   * Sets the current slide as center and adjacent slides as left/right
   */
  updateCentralSlidePositions() {
    this.slides.forEach(slide => {
      slide.removeAttribute('data-slide-position')
      slide.removeAttribute('data-animating')
      slide.removeAttribute('aria-current')
      slide.ariaHidden = 'true'
    })

    const current = this.slides[this.currentIndex]
    const prevSlide = this.slides[this.currentIndex - 1]
    const nextSlide = this.slides[this.currentIndex + 1]

    current.dataset.slidePosition = 'center'
    current.setAttribute('aria-current', 'true')
    current.ariaHidden = 'false'

    if (prevSlide) prevSlide.dataset.slidePosition = 'left'
    if (nextSlide) nextSlide.dataset.slidePosition = 'right'

    this._logger(`[Slider: ${this.sliderId}] Position updated – Center: ${this.currentIndex}`)
  }

  /**
   * Updates off-screen slide positions using data attributes
   * Positions slides that are not in the center/left/right visible area
   */
  updateOffsetSlidePositions() {
    // Remove any existing offscreen animation states
    this.slides.forEach(slide => {
      const currentAnimating = slide.dataset.animating
      if (currentAnimating && currentAnimating.includes('offscreen')) {
        slide.removeAttribute('data-animating')
      }
    })

    for (let i = 0; i < this.currentIndex - 1; i++) {
      if (!this.slides[i].dataset.slidePosition || !this.slides[i].dataset.slidePosition.includes('offscreen')) {
        this.slides[i].dataset.slidePosition = 'offscreen-left'
      }
      this.slides[i].ariaHidden = 'true'
    }

    for (let i = this.currentIndex + 2; i < this.slides.length; i++) {
      if (!this.slides[i].dataset.slidePosition || !this.slides[i].dataset.slidePosition.includes('offscreen')) {
        this.slides[i].dataset.slidePosition = 'offscreen-right'
      }
      this.slides[i].ariaHidden = 'true'
    }
  }

  /**
   * Pre-marks the next slides which will roll into view (data-next)
   * Helps with animation preparation and performance optimization
   */
  updateNextSlidePositions() {
    this.slides.forEach(slide => delete slide.dataset.next)

    const offLeft = this.slides[this.currentIndex - 2]
    const offRight = this.slides[this.currentIndex + 2]
    if (offLeft) offLeft.dataset.next = 'true'
    if (offRight) offRight.dataset.next = 'true'
  }

  /**
   * Identifies if a slide is a copy slide (used for infinite scrolling)
   */
  isCopySlide(slide) { return slide && slide.dataset.copySlide === 'true' }

  /**
   * Deletes duplicate slide that became a real slide after navigation
   * Maintains the infinite scroll illusion by removing excess copies
   */
  deleteDuplication(direction) {
    this._logger(direction === 'left' ? 'Most left reached' : 'Most right reached')
    if (direction === 'left') {
      const dup = this.slides[this.slides.length - 2]
      dup.remove()
      this.slides.splice(this.slides.length - 2, 1)
    } else {
      const dup = this.slides[1]
      dup.remove()
      this.slides.splice(1, 1)
    }
  }

  /**
   * Core navigation handler for slide transitions
   * Handles both left and right navigation with smooth animations
   */
  navigate(direction) {
    if (this.isTransitioning) {
      this._logger(`[Slider: ${this.sliderId}] Navigation blocked – transition in progress`)
      return
    }
    if (this.slides.length <= 1) {
      this._logger(`[Slider: ${this.sliderId}] Navigation skipped – not enough slides`)
      return
    }

    const rightward = direction === 'right'
    const step = rightward ? 1 : -1

    // Resolve slide elements via array indices (cheaper than multiple querySelector calls)
    const centerSlide = this.slides[this.currentIndex]
    const targetSlide = this.slides[this.currentIndex + step]
    const offScreenSlide = this.slides[this.currentIndex - step]
    const onScreenSlide = this.slides[this.currentIndex + 2 * step]

    if (!centerSlide || !targetSlide || !offScreenSlide || !onScreenSlide) {
      this._logger(`[Slider: ${this.sliderId}] Error: Could not find slides for animation`)
      return
    }

    this.isTransitioning = true

    // Assign animation states using data attributes
    if (rightward) {
      centerSlide.dataset.animating = 'center-to-left'
      targetSlide.dataset.animating = 'right-to-center'
      offScreenSlide.dataset.animating = 'left-to-offscreen'
      onScreenSlide.dataset.animating = 'offscreen-to-right'
      this.currentIndex += 1
    } else {
      centerSlide.dataset.animating = 'center-to-right'
      targetSlide.dataset.animating = 'left-to-center'
      offScreenSlide.dataset.animating = 'right-to-offscreen'
      onScreenSlide.dataset.animating = 'offscreen-to-left'
      this.currentIndex -= 1
    }

    this._logger(`[Slider: ${this.sliderId}] Transition started, new index will be: ${this.currentIndex}`)

    const onAnimEnd = () => {
      this.updateCentralSlidePositions()
      const curLeft = this.slides[this.currentIndex - 1]
      const curRight = this.slides[this.currentIndex + 1]
      this.updateOffsetSlidePositions()

      if (this.isCopySlide(curLeft) || this.isCopySlide(curRight)) {
        curLeft && curLeft.removeAttribute('data-copy-slide')
        curRight && curRight.removeAttribute('data-copy-slide')
        this.updateOffsetSlidePositions()
        this.deleteDuplication(direction)
        this.resetCopySlides()
        this.currentIndex = this.slides.findIndex(child => child.getAttribute('aria-current') === 'true')
      }

      this.updateNextSlidePositions()
      this.isTransitioning = false
    }

    targetSlide.addEventListener('animationend', onAnimEnd, { once: true })

    /* Reset timer on any manual navigation */
    this.restartAutoplay()
  }

  /**
   * Starts the autoplay timer for automatic slide progression
   * Only starts if autoplay is enabled and not already running
   */
  startAutoplay() {
    if (!this.autoplayEnabled || this.autoplayTimer) return
    this.autoplayTimer = setInterval(() => this.navigate('right'), this.autoplayInterval)
    this._logger(`[Slider: ${this.sliderId}] Autoplay started (interval: ${this.autoplayInterval} ms)`)
  }

  /**
   * Stops the autoplay timer
   * Clears the interval and resets the timer reference
   */
  stopAutoplay() {
    if (!this.autoplayTimer) return
    clearInterval(this.autoplayTimer)
    this.autoplayTimer = null
    this._logger(`[Slider: ${this.sliderId}] Autoplay paused`)
  }

  /**
   * Restarts the autoplay timer
   * Stops current timer and starts a new one (used after manual navigation)
   */
  restartAutoplay() {
    if (!this.autoplayEnabled) return
    this.stopAutoplay()
    this.startAutoplay()
  }
}

// Export the class for use in other modules
export default ImageSlider;
