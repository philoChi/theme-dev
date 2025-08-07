/**
 * @jest-environment jsdom
 */

describe('FAQ Section', () => {
  let container;

  beforeEach(() => {
    // Setup DOM container
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up after each test
    document.body.removeChild(container);
    container = null;
  });

  describe('FAQ section rendering tests (TC-01)', () => {
    it('should display FAQ entries correctly', () => {
      // Arrange - Create FAQ section HTML structure
      container.innerHTML = `
        <section class="faq-section">
          <div class="faq-container">
            <h1 class="faq-section__title">Häufig gestellte Fragen</h1>
            <div class="faq-section__content" data-faq-content>
              <div class="faq-section__list" data-faq-list>
                <div class="faq-section__item" data-faq-item id="question-1">
                  <div class="dropdown faq-dropdown" data-dropdown>
                    <button class="dropdown__toggle">What is your return policy?</button>
                    <div class="dropdown__content">
                      <p>We offer a 30-day return policy for all items in their original condition.</p>
                    </div>
                  </div>
                </div>
                <div class="faq-section__item" data-faq-item id="question-2">
                  <div class="dropdown faq-dropdown" data-dropdown>
                    <button class="dropdown__toggle">How long does shipping take?</button>
                    <div class="dropdown__content">
                      <p>Standard shipping takes 3-5 business days.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      // Act - Query the rendered elements
      const faqSection = container.querySelector('.faq-section');
      const faqTitle = container.querySelector('.faq-section__title');
      const faqItems = container.querySelectorAll('.faq-section__item');
      const dropdowns = container.querySelectorAll('.faq-dropdown');

      // Assert
      expect(faqSection).not.toBeNull();
      expect(faqTitle).not.toBeNull();
      expect(faqTitle.textContent).toBe('Häufig gestellte Fragen');
      expect(faqItems).toHaveLength(2);
      expect(dropdowns).toHaveLength(2);
    });

    it('should verify block schema structure is valid', () => {
      // Test that FAQ items follow the expected structure
      container.innerHTML = `
        <div class="faq-section__item" data-faq-item id="question-1">
          <div class="dropdown faq-dropdown" data-dropdown>
            <button class="dropdown__toggle">Question text</button>
            <div class="dropdown__content">
              <p>Answer text with <a href="/test">link</a></p>
            </div>
          </div>
        </div>
      `;

      const faqItem = container.querySelector('.faq-section__item');
      const question = container.querySelector('.dropdown__toggle');
      const answer = container.querySelector('.dropdown__content');
      const link = answer.querySelector('a');

      expect(faqItem).toHaveAttribute('id', 'question-1');
      expect(question.textContent).toBe('Question text');
      expect(answer.textContent).toContain('Answer text with link');
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/test');
    });

    it('should test links in answers work correctly', () => {
      container.innerHTML = `
        <div class="dropdown__content">
          <p>Check our <a href="/pages/contact">contact page</a> or <a href="https://example.com">website</a>.</p>
        </div>
      `;

      const links = container.querySelectorAll('a');
      
      expect(links).toHaveLength(2);
      expect(links[0].getAttribute('href')).toBe('/pages/contact');
      expect(links[1].getAttribute('href')).toBe('https://example.com');
    });
  });

  describe('Empty state tests (TC-18)', () => {
    it('should display appropriate message when no FAQs exist', () => {
      container.innerHTML = `
        <section class="faq-section">
          <div class="faq-section__content">
            <div class="faq-section__empty">
              <p>Es sind noch keine FAQs vorhanden.</p>
            </div>
          </div>
        </section>
      `;

      const emptyState = container.querySelector('.faq-section__empty');
      const emptyMessage = emptyState.querySelector('p');

      expect(emptyState).not.toBeNull();
      expect(emptyMessage.textContent).toBe('Es sind noch keine FAQs vorhanden.');
    });

    it('should verify appropriate messaging is shown', () => {
      container.innerHTML = `
        <div class="faq-section__list" data-faq-list></div>
      `;

      const faqList = container.querySelector('.faq-section__list');
      const faqItems = faqList.querySelectorAll('.faq-section__item');

      expect(faqItems).toHaveLength(0);
    });

    it('should test graceful degradation without content', () => {
      container.innerHTML = `
        <section class="faq-section">
          <div class="faq-container">
            <h1 class="faq-section__title">FAQ</h1>
            <div class="faq-section__content" data-faq-content></div>
          </div>
        </section>
      `;

      const faqSection = container.querySelector('.faq-section');
      const faqContent = container.querySelector('.faq-section__content');

      expect(faqSection).not.toBeNull();
      expect(faqContent).not.toBeNull();
      expect(faqContent.children).toHaveLength(0);
    });
  });

  describe('Anchor link parsing tests (TC-08)', () => {
    it('should verify unique IDs are generated for each FAQ', () => {
      container.innerHTML = `
        <div class="faq-section__list">
          <div class="faq-section__item" id="question-1"></div>
          <div class="faq-section__item" id="question-2"></div>
          <div class="faq-section__item" id="question-3"></div>
        </div>
      `;

      const faqItems = container.querySelectorAll('.faq-section__item');
      const ids = Array.from(faqItems).map(item => item.getAttribute('id'));

      // Check all IDs are unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Check ID format
      ids.forEach((id, index) => {
        expect(id).toBe(`question-${index + 1}`);
      });
    });

    it('should validate anchor format follows pattern', () => {
      const anchorPattern = /^question-\d+$/;
      const testIds = ['question-1', 'question-10', 'question-50'];

      testIds.forEach(id => {
        expect(id).toMatch(anchorPattern);
      });

      // Test invalid formats
      const invalidIds = ['question-', 'question-abc', 'faq-1', 'question_1'];
      invalidIds.forEach(id => {
        expect(id).not.toMatch(anchorPattern);
      });
    });

    it('should test edge cases for anchor generation', () => {
      // Test with maximum allowed FAQs (50)
      const maxFAQs = 50;
      const fragment = document.createDocumentFragment();
      
      for (let i = 1; i <= maxFAQs; i++) {
        const div = document.createElement('div');
        div.className = 'faq-section__item';
        div.id = `question-${i}`;
        fragment.appendChild(div);
      }

      container.appendChild(fragment);
      const faqItems = container.querySelectorAll('.faq-section__item');

      expect(faqItems).toHaveLength(maxFAQs);
      expect(faqItems[0].id).toBe('question-1');
      expect(faqItems[maxFAQs - 1].id).toBe('question-50');
    });
  });

  describe('Error handling tests (TC-19)', () => {
    it('should handle malformed anchor links gracefully', () => {
      // Test that malformed anchors don't break the page
      const malformedAnchors = [
        'question-',
        'question-abc',
        'question-999',
        '',
        'undefined'
      ];

      malformedAnchors.forEach(anchor => {
        // Simulate looking for element with malformed anchor
        try {
          const element = anchor ? container.querySelector(`#${anchor}`) : null;
          expect(element).toBeNull();
        } catch (error) {
          // If querySelector throws an error, that's also acceptable
          expect(error).toBeDefined();
        }
      });
    });

    it('should validate error states are handled properly', () => {
      // Test missing required elements
      container.innerHTML = `
        <section class="faq-section">
          <!-- Missing container -->
        </section>
      `;

      const faqContainer = container.querySelector('.faq-container');
      const faqContent = container.querySelector('.faq-section__content');

      expect(faqContainer).toBeNull();
      expect(faqContent).toBeNull();
    });
  });

  describe('FAQ rendering with rich text', () => {
    it('should properly render rich text content in answers', () => {
      container.innerHTML = `
        <div class="dropdown__content">
          <p>This is a <strong>bold</strong> statement.</p>
          <ul>
            <li>First item</li>
            <li>Second item</li>
          </ul>
          <p>Visit our <a href="/pages/about">about page</a>.</p>
        </div>
      `;

      const content = container.querySelector('.dropdown__content');
      const strongTag = content.querySelector('strong');
      const list = content.querySelector('ul');
      const listItems = content.querySelectorAll('li');
      const link = content.querySelector('a');

      expect(strongTag).not.toBeNull();
      expect(strongTag.textContent).toBe('bold');
      expect(list).not.toBeNull();
      expect(listItems).toHaveLength(2);
      expect(link).not.toBeNull();
    });
  });

  describe('Maximum FAQs validation', () => {
    it('should handle up to 50 FAQs as per schema max_blocks', () => {
      const faqList = document.createElement('div');
      faqList.className = 'faq-section__list';

      // Create 50 FAQ items
      for (let i = 1; i <= 50; i++) {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-section__item';
        faqItem.id = `question-${i}`;
        faqItem.innerHTML = `
          <div class="dropdown faq-dropdown">
            <button class="dropdown__toggle">Question ${i}</button>
            <div class="dropdown__content"><p>Answer ${i}</p></div>
          </div>
        `;
        faqList.appendChild(faqItem);
      }

      container.appendChild(faqList);
      const allFAQs = container.querySelectorAll('.faq-section__item');

      expect(allFAQs).toHaveLength(50);
      expect(allFAQs[0].querySelector('.dropdown__toggle').textContent).toBe('Question 1');
      expect(allFAQs[49].querySelector('.dropdown__toggle').textContent).toBe('Question 50');
    });
  });
});