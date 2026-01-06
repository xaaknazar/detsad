let navbar = document.querySelector('.navbar');
let menuBtn = document.querySelector('#menu-btn');

if (menuBtn) {
    menuBtn.onclick = () => {
        navbar.classList.toggle('active');
        menuBtn.classList.toggle('fa-times');
    }
}

// Закрываем меню при клике на ссылку
let navLinks = document.querySelectorAll('.navbar a');
navLinks.forEach(link => {
    link.onclick = () => {
        navbar.classList.remove('active');
        if (menuBtn) {
            menuBtn.classList.remove('fa-times');
            menuBtn.classList.add('fa-bars');
        }
    }
});

// Закрываем меню при прокрутке
window.onscroll = () => {
    navbar.classList.remove('active');
    if (menuBtn) {
        menuBtn.classList.remove('fa-times');
        menuBtn.classList.add('fa-bars');
    }
}