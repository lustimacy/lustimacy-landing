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

    // ——— Screenshots horizontal scroll with drag ———
    var carousel = document.querySelector('.screenshots-carousel');
    if (carousel) {
        var isDown = false;
        var startX;
        var scrollLeft;

        carousel.addEventListener('mousedown', function (e) {
            isDown = true;
            carousel.classList.add('dragging');
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener('mouseleave', function () {
            isDown = false;
            carousel.classList.remove('dragging');
        });

        carousel.addEventListener('mouseup', function () {
            isDown = false;
            carousel.classList.remove('dragging');
        });

        carousel.addEventListener('mousemove', function (e) {
            if (!isDown) return;
            e.preventDefault();
            var x = e.pageX - carousel.offsetLeft;
            var walk = (x - startX) * 1.5;
            carousel.scrollLeft = scrollLeft - walk;
        });
    }
})();
