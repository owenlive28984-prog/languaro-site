// Waitlist form handling
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('waitlist-form');
    const emailInput = document.getElementById('email');
    const submitBtn = form.querySelector('.submit-btn');
    const formMessage = document.getElementById('form-message');

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validate email
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        formMessage.textContent = '';

        try {
            const result = await submitToWaitlist(email);

            const successMessage = result?.message || "✓ Thank you! You've been added to the waitlist";
            showMessage(successMessage.startsWith('✓') ? successMessage : `✓ ${successMessage}`, 'success');
            emailInput.value = '';
            
            // Store in localStorage for demo purposes
            addToLocalWaitlist(email);
            
        } catch (error) {
            const errorMessage = error?.message || 'Something went wrong. Please try again.';
            showMessage(errorMessage, 'error');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show message helper
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        
        // Auto-clear success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                formMessage.textContent = '';
                formMessage.className = 'form-message';
            }, 5000);
        }
    }

    // Submit email to Vercel serverless function (with local fallback when opened from filesystem)
    async function submitToWaitlist(email) {
        if (window.location.protocol === 'file:') {
            return {
                ok: true,
                message: 'Saved locally (deploy to Vercel to record submissions server-side).',
                localOnly: true
            };
        }

        const response = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        let data = {};
        try {
            data = await response.json();
        } catch (err) {
            // ignore JSON parse errors and fall back to generic handling
        }

        if (!response.ok || data?.ok === false) {
            const message = data?.error || response.statusText || 'Unable to submit right now.';
            throw new Error(message);
        }

        return data;
    }

    // Store in localStorage (for demo purposes)
    function addToLocalWaitlist(email) {
        const waitlist = JSON.parse(localStorage.getItem('languaro-waitlist') || '[]');
        
        if (!waitlist.includes(email)) {
            waitlist.push(email);
            localStorage.setItem('languaro-waitlist', JSON.stringify(waitlist));
        }
    }

    // Real-time email validation feedback
    emailInput.addEventListener('input', () => {
        if (emailInput.value && !isValidEmail(emailInput.value)) {
            emailInput.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        } else {
            emailInput.style.borderColor = '';
        }
    });

    // Add subtle parallax effect to hero section
    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            
            const logo = document.querySelector('.logo');
            if (logo) {
                logo.style.transform = `translate(${moveX}px, ${moveY}px)`;
            }
        });
    }

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards for staggered animation
    const features = document.querySelectorAll('.feature');
    features.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(feature);
    });

    // Enhanced feature card interactions
    let activeFeature = null;
    
    features.forEach(feature => {
        // Desktop: hover behavior
        feature.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                activeFeature = feature;
                feature.classList.add('expanded');
            }
        });

        feature.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                activeFeature = null;
                feature.classList.remove('expanded');
            }
        });

        // Mobile: tap to expand/collapse
        feature.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                
                // Close other expanded features
                features.forEach(f => {
                    if (f !== feature) {
                        f.classList.remove('expanded');
                    }
                });

                // Toggle current feature
                feature.classList.toggle('expanded');
                activeFeature = feature.classList.contains('expanded') ? feature : null;

                // Smooth scroll to expanded feature
                if (feature.classList.contains('expanded')) {
                    setTimeout(() => {
                        feature.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest' 
                        });
                    }, 100);
                }
            }
        });
    });

    // Close expanded features when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && activeFeature) {
            if (!e.target.closest('.feature')) {
                features.forEach(f => f.classList.remove('expanded'));
                activeFeature = null;
            }
        }
    });

    // Add keyboard shortcut (Ctrl/Cmd + K) to focus email input
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            emailInput.focus();
        }
    });

    // Console easter egg
    console.log('%cLanguaro', 'font-size: 48px; font-weight: bold; color: #e6e6e6;');
    console.log('%cUniversal translation for your desktop', 'font-size: 16px; color: #bfbfbf;');
    console.log('%cInterested in joining our team? Email us at hello@languaro.com', 'font-size: 12px; color: #999999;');
});

// Add smooth reveal on page load
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    });
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}
