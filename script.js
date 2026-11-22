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

const filters = document.querySelector(".catalog-filters");
const projects = document.querySelectorAll(".catalog .case-card");

function filterProjects(filter) {
    for (const project of projects) {
        project.hidden = filter === "ios" && project.dataset.projectPlatform === "cross-platform";
    }
    for (const button of filters.querySelectorAll("button")) {
        button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    }
}

filters.hidden = false;
filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (button) filterProjects(button.dataset.filter);
});

function expandProject(id) {
    const project = document.getElementById(id);
    const details = project?.querySelector("details");
    if (!details) return;
    if (project.hidden) filterProjects("all");
    details.open = true;
}

function openLinkedProject() {
    expandProject(window.location.hash.slice(1));
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
        expandProject(link.hash.slice(1));
    });
});
window.addEventListener("hashchange", openLinkedProject);
openLinkedProject();

const enquiry = document.getElementById("enquiry-form");
enquiry.hidden = false;
enquiry.addEventListener("submit", (event) => {
    event.preventDefault();
    const details = new FormData(enquiry);
    const subject = String(details.get("subject")).trim();
    const body = [
        `Name: ${details.get("name")}`,
        `Email: ${details.get("email")}`,
        "",
        details.get("message"),
    ].join("\n");
    window.location.href = `mailto:abdulsami.sultan.ask@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
