// Lustimacy Landing Page — main.js

(function () {
    'use strict';

    // ——— Mobile Navigation Toggle ———
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
        navToggle.classList.toggle('active');
    });

    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
        });
    });

    // Close mobile menu when tapping outside
    document.addEventListener('click', function (e) {
        if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
        }
    });

    // ——— Navbar scroll background ———
    function updateNavbar() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();

    // ——— Smooth scrolling for anchor links ———
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            var navHeight = navbar.offsetHeight;
            var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });

    // ——— Scroll-triggered fade-in animations ———
    var fadeElements = document.querySelectorAll('.fade-in');

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        fadeElements.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        // Fallback: just show everything
        fadeElements.forEach(function (el) {
            el.classList.add('visible');
        });
    }

    // ——— FAQ Accordion ———
    document.querySelectorAll('.faq-question').forEach(function (button) {
        button.addEventListener('click', function () {
            var faqItem = this.parentElement;
            var isOpen = faqItem.classList.contains('open');

            // Close all other items
            document.querySelectorAll('.faq-item.open').forEach(function (item) {
                item.classList.remove('open');
            });

            // Toggle the clicked item
            if (!isOpen) {
                faqItem.classList.add('open');
            }
        });
    });

    // ——— Screenshots carousel: arrows + drag + scroll hint ———
    var carousel = document.querySelector('.screenshots-carousel');
    if (carousel) {
        carousel.scrollLeft = 0;

        var leftBtn = document.querySelector('.carousel-arrow-left');
        var rightBtn = document.querySelector('.carousel-arrow-right');
        var scrollStep = 300;

        // Arrow clicks
        if (leftBtn) {
            leftBtn.addEventListener('click', function () {
                carousel.scrollBy({ left: -scrollStep, behavior: 'smooth' });
            });
        }
        if (rightBtn) {
            rightBtn.addEventListener('click', function () {
                carousel.scrollBy({ left: scrollStep, behavior: 'smooth' });
            });
        }

        // Arrow visibility
        function updateArrows() {
            if (!leftBtn || !rightBtn) return;
            var sl = carousel.scrollLeft;
            var max = carousel.scrollWidth - carousel.clientWidth;
            leftBtn.classList.toggle('hidden', sl <= 10);
            rightBtn.classList.toggle('hidden', sl >= max - 10);
        }
        carousel.addEventListener('scroll', updateArrows);
        setTimeout(updateArrows, 100);

        // Drag to scroll
        var isDown = false, startX, scrollLeftPos;
        carousel.addEventListener('mousedown', function (e) {
            isDown = true;
            carousel.style.scrollSnapType = 'none';
            startX = e.pageX - carousel.offsetLeft;
            scrollLeftPos = carousel.scrollLeft;
        });
        carousel.addEventListener('mouseleave', function () {
            isDown = false;
            carousel.style.scrollSnapType = '';
        });
        carousel.addEventListener('mouseup', function () {
            isDown = false;
            carousel.style.scrollSnapType = '';
        });
        carousel.addEventListener('mousemove', function (e) {
            if (!isDown) return;
            e.preventDefault();
            var x = e.pageX - carousel.offsetLeft;
            carousel.scrollLeft = scrollLeftPos - (x - startX) * 1.5;
        });

        // One-time scroll hint when section enters viewport
        var hintDone = false;
        var screenshotsSection = document.getElementById('screenshots');
        if (screenshotsSection) {
            var hintObserver = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting && !hintDone) {
                    hintDone = true;
                    hintObserver.disconnect();
                    setTimeout(function () {
                        carousel.scrollBy({ left: 250, behavior: 'smooth' });
                        setTimeout(function () {
                            carousel.scrollBy({ left: -250, behavior: 'smooth' });
                        }, 500);
                    }, 300);
                }
            }, { threshold: 0.3 });
            hintObserver.observe(screenshotsSection);
        }
    }
})();
