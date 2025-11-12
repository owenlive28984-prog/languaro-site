// Updates subscription handling
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('waitlist-form');
    const emailInput = document.getElementById('email');
    const submitBtn = form ? form.querySelector('.submit-btn') : null;
    const formMessage = document.getElementById('form-message');
    const demoGif = document.querySelector('.demo-gif');
    const demoFrames = demoGif ? Array.from(demoGif.querySelectorAll('.demo-gif-frame')) : [];
    let demoTimer;

    // Form submission
    if (form && emailInput && submitBtn) {
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
            if (formMessage) formMessage.textContent = '';

            try {
                const result = await submitToWaitlist(email);

                const successMessage = result?.message || "✓ Thanks! You're subscribed";
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
    }

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
                message: 'Saved locally (deploy to Vercel to record subscriptions server-side).',
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
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            if (emailInput.value && !isValidEmail(emailInput.value)) {
                emailInput.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            } else {
                emailInput.style.borderColor = '';
            }
        });
    }

    // Cycle demo GIF frames sequentially
    if (demoFrames.length > 1) {
        let currentIndex = demoFrames.findIndex(frame => frame.classList.contains('active'));
        if (currentIndex < 0) currentIndex = 0;

        const defaultDuration = parseInt(demoGif.dataset.defaultDuration, 10) || 7000;

        const scheduleNextFrame = (delay) => {
            clearTimeout(demoTimer);
            demoTimer = setTimeout(() => {
                demoFrames[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % demoFrames.length;
                demoFrames[currentIndex].classList.add('active');
                const nextDuration = parseInt(demoFrames[currentIndex].dataset.duration, 10) || defaultDuration;
                scheduleNextFrame(nextDuration);
            }, delay);
        };

        const initialDuration = parseInt(demoFrames[currentIndex].dataset.duration, 10) || defaultDuration;
        scheduleNextFrame(initialDuration);
    }

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
        if (window.innerWidth <= 768 && activeFeature && !e.target.closest('.feature')) {
            features.forEach(f => f.classList.remove('expanded'));
            activeFeature = null;
        }
    });

    // Add keyboard shortcut (Ctrl/Cmd + K) to focus email input
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && emailInput) {
            e.preventDefault();
            emailInput.focus();
            emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // Handle pricing button clicks → Stripe checkout or scroll to waitlist
    const pricingButtons = document.querySelectorAll('.plan-btn');
    const waitlistSection = document.querySelector('.waitlist');
    const heroCta = document.getElementById('hero-cta');
    const pricingSection = document.getElementById('pricing');

    if (pricingButtons.length) {
        pricingButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const plan = button.getAttribute('data-plan');
                const stripePriceId = button.getAttribute('data-stripe-price');
                
                // Free plan - scroll to waitlist
                if (plan === 'free') {
                    if (waitlistSection && emailInput) {
                        waitlistSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        setTimeout(() => emailInput.focus(), 600);
                    }
                    return;
                }
                
                // Paid plans - redirect to Stripe Checkout
                if (stripePriceId && stripePriceId !== 'price_xxx' && stripePriceId !== 'price_yyy') {
                    // Show loading state
                    button.disabled = true;
                    const originalText = button.textContent;
                    button.textContent = 'Loading...';
                    
                    try {
                        // Call your checkout API
                        const response = await fetch('/api/create-checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                priceId: stripePriceId,
                                plan: plan
                            })
                        });
                        
                        let data = {};
                        try {
                            data = await response.json();
                        } catch (err) {
                            // ignore JSON parse errors so we can throw a clearer message below
                        }

                        if (!response.ok) {
                            const message = data?.error || `Checkout failed (${response.status})`;
                            throw new Error(message);
                        }

                        if (data.url) {
                            // Redirect to Stripe Checkout
                            window.location.href = data.url;
                        } else {
                            throw new Error(data?.error || 'No checkout URL returned');
                        }
                    } catch (error) {
                        console.error('Checkout error:', error);
                        alert('Unable to start checkout. Please try again or contact support.');
                        button.disabled = false;
                        button.textContent = originalText;
                    }
                } else {
                    // Stripe not configured yet - scroll to waitlist
                    if (waitlistSection && emailInput) {
                        waitlistSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        setTimeout(() => emailInput.focus(), 600);
                    }
                }
            });
        });
    }

    if (heroCta && pricingSection) {
        heroCta.addEventListener('click', (e) => {
            e.preventDefault();

            pricingSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

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
