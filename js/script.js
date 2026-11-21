
/* =========================================
   EDU. DISTRICT III
   Shared interactions (year, mobile menu). Auth lives in auth.js
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

  // 1. AUTOMATIC COPYRIGHT YEAR

  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }


  // 2. MOBILE NAVIGATION MENU

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuButton && navigation) {

    menuButton.addEventListener("click", () => {

      const isOpen = navigation.classList.toggle("active");

      menuButton.setAttribute("aria-expanded", isOpen);

      menuButton.textContent = isOpen ? "Close" : "Menu";

    });

    // Close menu after selecting a navigation link

    navigation.querySelectorAll("a").forEach(link => {

      link.addEventListener("click", () => {

        navigation.classList.remove("active");

        menuButton.setAttribute("aria-expanded", "false");

        menuButton.textContent = "Menu";

      });

    });

  }

});
