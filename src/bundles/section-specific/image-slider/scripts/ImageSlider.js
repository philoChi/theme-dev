// section-image-slider-optimized.js
// Minimal‑change optimisation of the original simplified slider.
// Goal: identical functionality with marginally better runtime perf and lower logical
// complexity. All public behaviour (copy‑slides, off‑screen teleport, debug output)
// is preserved.

class SimpleImageSlider {
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

    // Find the index with class "active" (if present)
    const activeIndex = this.slides.findIndex(s => s.classList.contains('active'))

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

    // Kick‑off
    this.init()

    /* ----------------------  Autoplay wiring  ---------------------- */
    if (this.autoplayEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.startAutoplay()

      /* Pause on user interaction; resume afterwards */
      const pause = () => this.stopAutoplay()
      const resume = () => this.startAutoplay()
        ;['mouseenter', 'focusin', 'touchstart'].forEach(e => sliderElement.addEventListener(e, pause, { passive: true }))
        ;['mouseleave', 'focusout', 'touchend'].forEach(e => sliderElement.addEventListener(e, resume, { passive: true }))
    }

    /* ⇢ SWIPE SUPPORT – pointer‑based horizontal swipe */
    this._setupSwipeEvents()
  }

  /* ----------------------  Swipe helpers  ---------------------- */
  // ⇢ SWIPE SUPPORT: adds lightweight horizontal‑swipe handling
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
   * One‑off initialisation tasks
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
  getNextIndexValid() { return true }

  /**
   * Removes old copy slides + inserts fresh clones at both ends
   */
  resetCopySlides() {
    const copys = this.container.querySelectorAll('[data-copy-slide]')
    copys.forEach(el => el.remove())

    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))
    const lastReal = this.slides[this.slides.length - 1].cloneNode(true)
    const firstReal = this.slides[0].cloneNode(true)

      ;[lastReal, firstReal].forEach(clone => {
        clone.dataset.copySlide = 'true'
        clone.classList.remove('image-slider__slide--right', 'image-slider__slide--left', 'image-slider__slide--offscreen-right', 'image-slider__slide--offscreen-left')
      })

    lastReal.classList.add('image-slider__slide--offscreen-left')
    firstReal.classList.add('image-slider__slide--offscreen-right')

    this.container.prepend(lastReal)
    this.container.append(firstReal)

    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'))
  }

  /**
   * Central, left & right slide classes
   */
  updateCentralSlidePositions() {
    this.slides.forEach(slide => {
      slide.classList.remove(
        'image-slider__slide--center', 'image-slider__slide--left', 'image-slider__slide--right',
        'image-slider__slide--transition-center-to-left', 'image-slider__slide--transition-center-to-right',
        'image-slider__slide--transition-left-to-center', 'image-slider__slide--transition-right-to-center',
        'active'
      )
      slide.ariaHidden = 'true'
    })

    const current = this.slides[this.currentIndex]
    const prevSlide = this.slides[this.currentIndex - 1]
    const nextSlide = this.slides[this.currentIndex + 1]

    current.classList.add('image-slider__slide--center', 'active')
    current.ariaHidden = 'false'

    if (prevSlide) prevSlide.classList.add('image-slider__slide--left')
    if (nextSlide) nextSlide.classList.add('image-slider__slide--right')

    this._logger(`[Slider: ${this.sliderId}] Position updated – Center: ${this.currentIndex}`)
  }

  /**
   * Off‑screen classes
   */
  updateOffsetSlidePositions() {
    this.slides.forEach(slide => {
      slide.classList.remove(
        'image-slider__slide--offscreen-left', 'image-slider__slide--offscreen-right',
        'image-slider__slide--transition-offscreen-to-right', 'image-slider__slide--transition-offscreen-to-left',
        'image-slider__slide--transition-left-to-offscreen', 'image-slider__slide--transition-right-to-offscreen'
      )
    })

    for (let i = 0; i < this.currentIndex - 1; i++) {
      this.slides[i].classList.add('image-slider__slide--offscreen-left')
      this.slides[i].ariaHidden = 'true'
    }

    for (let i = this.currentIndex + 2; i < this.slides.length; i++) {
      this.slides[i].classList.add('image-slider__slide--offscreen-right')
      this.slides[i].ariaHidden = 'true'
    }
  }

  /**
   * Pre‑marks the next slide which will roll into view (data-next)
   */
  updateNextSlidePositions() {
    this.slides.forEach(slide => delete slide.dataset.next)

    const offLeft = this.slides[this.currentIndex - 2]
    const offRight = this.slides[this.currentIndex + 2]
    if (offLeft) offLeft.dataset.next = 'true'
    if (offRight) offRight.dataset.next = 'true'
  }

  /**
   * Identifies a copy slide
   */
  isCopySlide(slide) { return slide && slide.dataset.copySlide === 'true' }

  /**
   * Deletes duplication slide that became a real slide after navigation
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
   * Core navigation handler
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

    // Assign animation classes
    if (rightward) {
      centerSlide.classList.add('image-slider__slide--transition-center-to-left')
      targetSlide.classList.add('image-slider__slide--transition-right-to-center')
      offScreenSlide.classList.add('image-slider__slide--transition-left-to-offscreen')
      onScreenSlide.classList.add('image-slider__slide--transition-offscreen-to-right')
      this.currentIndex += 1
    } else {
      centerSlide.classList.add('image-slider__slide--transition-center-to-right')
      targetSlide.classList.add('image-slider__slide--transition-left-to-center')
      offScreenSlide.classList.add('image-slider__slide--transition-right-to-offscreen')
      onScreenSlide.classList.add('image-slider__slide--transition-offscreen-to-left')
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
        this.currentIndex = this.slides.findIndex(child => child.classList.contains('active'))
      }

      this.updateNextSlidePositions()
      this.isTransitioning = false
    }

    targetSlide.addEventListener('animationend', onAnimEnd, { once: true })

    /* Reset timer on any manual navigation */
    this.restartAutoplay()
  }

  /* ------------------  Autoplay helpers  ------------------ */
  startAutoplay() {
    if (!this.autoplayEnabled || this.autoplayTimer) return
    this.autoplayTimer = setInterval(() => this.navigate('right'), this.autoplayInterval)
    this._logger(`[Slider: ${this.sliderId}] Autoplay started (interval: ${this.autoplayInterval} ms)`)
  }

  stopAutoplay() {
    if (!this.autoplayTimer) return
    clearInterval(this.autoplayTimer)
    this.autoplayTimer = null
    this._logger(`[Slider: ${this.sliderId}] Autoplay paused`)
  }

  restartAutoplay() {
    if (!this.autoplayEnabled) return
    this.stopAutoplay()
    this.startAutoplay()
  }
}

// DOM‑ready bootstrap (unchanged except for logger wrapper)

document.addEventListener('DOMContentLoaded', () => {
  const logger = (typeof StartUpLogger !== 'undefined' && StartUpLogger.init)
    ? StartUpLogger
    : { init: (msg) => { if (window.logger) window.logger.log(msg); } }

  logger.init('DOM Content Loaded – Starting slider initialization')

  const sliders = document.querySelectorAll('[data-section-type="image-slider"]')
  logger.init(`[Slider] Found ${sliders.length} slider(s) on the page`)

  sliders.forEach((slider, i) => {
    if (!slider.id) slider.id = `slider-${i + 1}`
    logger.init(`[Slider] Initializing slider #${i + 1} with ID: ${slider.id}`)

    try {
      new SimpleImageSlider(slider)
      logger.init(`[Slider] Slider #${i + 1} (${slider.id}) initialized successfully`)
    } catch (err) {
      logger.init(`[Slider] Failed to initialize slider #${i + 1} (${slider.id}):`, err)
    }
  })

  logger.init('[Slider] Initialization process complete')
})
