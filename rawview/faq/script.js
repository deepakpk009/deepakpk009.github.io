document.addEventListener('DOMContentLoaded', () => {
    fetch('faq.json')
        .then(response => response.json())
        .then(data => {
            const faqContainer = document.getElementById('faq-container');
            data.forEach(faq => {
                const faqItem = document.createElement('div');
                faqItem.classList.add('faq-item');

                const faqTitle = document.createElement('div');
                faqTitle.classList.add('faq-title');
                faqTitle.textContent = faq.title;
                faqItem.appendChild(faqTitle);

                const faqContent = document.createElement('div');
                faqContent.classList.add('faq-content');
                faqContent.textContent = faq.content;
                faqItem.appendChild(faqContent);

                faqTitle.addEventListener('click', () => {
                    const isExpanded = faqContent.style.display === 'block';
                    faqContent.style.display = isExpanded ? 'none' : 'block';
                });

                faqContainer.appendChild(faqItem);
            });
        })
        .catch(error => console.error('Error loading FAQ:', error));
});
