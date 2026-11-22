const menuToggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("site-links");
const mobileLayout = window.matchMedia("(max-width: 40rem)");

function setMenuOpen(open) {
    menuToggle.setAttribute("aria-expanded", String(open));
    menu.hidden = mobileLayout.matches && !open;
}

function syncNavigation() {
    menuToggle.hidden = !mobileLayout.matches;
    menu.classList.toggle("is-enhanced", mobileLayout.matches);
    setMenuOpen(false);
}

menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

menu.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link && mobileLayout.matches) {
        const section = document.getElementById(link.hash.slice(1));
        setMenuOpen(false);
        if (section) {
            section.setAttribute("tabindex", "-1");
            section.focus({ preventScroll: true });
        }
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        menuToggle.focus();
    }
});

mobileLayout.addEventListener("change", syncNavigation);
syncNavigation();
