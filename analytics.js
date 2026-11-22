async function createFirebaseReporter() {
    const { default: firebaseConfig } = await import("./firebase-config.generated.js").catch(() => ({}));
    if (!firebaseConfig) return null;

    const requiredFields = ["apiKey", "projectId", "appId", "measurementId"];
    if (requiredFields.some((field) => !firebaseConfig[field]?.trim())) return null;

    const [{ initializeApp }, { getAnalytics, isSupported, logEvent }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js"),
    ]);
    if (!(await isSupported())) return null;

    const analytics = getAnalytics(initializeApp(firebaseConfig));
    return (name, parameters) => logEvent(analytics, name, parameters);
}

async function initializePortfolioAnalytics() {
    const firebaseReport = await createFirebaseReporter().catch((error) => {
        console.warn("Firebase Analytics could not start.", error.message);
        return null;
    });
    if (!firebaseReport && !Array.isArray(window.dataLayer)) return;

    const report = firebaseReport || ((name, parameters) => {
        window.dataLayer.push({ event: name, ...parameters });
    });
    trackScroll((percent) => report("portfolio_scroll_depth", { depth_percent: percent }));
    trackViews(report);
    trackInteractions(report);
}

function trackViews(report) {
    if (!("IntersectionObserver" in window)) return;

    const views = new Map();
    const observer = new IntersectionObserver((entries) => {
        for (const { target, isIntersecting, intersectionRatio } of entries) {
            if (!isIntersecting || intersectionRatio < 0.5) continue;
            observer.unobserve(target);
            const onView = views.get(target);
            views.delete(target);
            onView?.();
        }
    }, { threshold: 0.5 });

    function observe(target, onView) {
        if (!target) return;
        views.set(target, onView);
        observer.observe(target);
    }

    for (const section of document.querySelectorAll("main section[id][aria-labelledby]")) {
        const heading = document.getElementById(section.getAttribute("aria-labelledby"));
        observe(heading, () => {
            const parameters = { section_id: section.id };
            report("section_view", parameters);
            const event = heading.dataset.analyticsView || (section.id === "testimonials" ? "testimonial_view" : "");
            if (event) report(event, parameters);
        });
    }

    for (const heading of document.querySelectorAll("[data-project-heading]")) {
        observe(heading, () => report("case_study_view", { project_id: heading.closest(".case-card").id }));
    }
    for (const heading of document.querySelectorAll("[data-project-id] .feature-top")) {
        const project = heading.closest("[data-project-id]");
        const event = project.matches(".project-gallery") ? "project_gallery_view" : "featured_project_view";
        observe(heading, () => report(event, { project_id: project.dataset.projectId }));
    }
    for (const link of document.querySelectorAll(".writing-card [data-article-id]")) {
        observe(link.querySelector("h3"), () => report("article_preview_view", { article_id: link.dataset.articleId }));
    }
}

function trackInteractions(report) {
    function trackActivation(event) {
        if (event.type === "auxclick" && event.button !== 1) return;
        const control = event.target.closest("a[href], summary[data-project-heading], button[data-filter], .menu-toggle");
        if (!control) return;

        if (control.matches("button[data-filter]")) {
            report("project_filter_select", { filter_id: control.dataset.filter });
        } else if (control.matches(".menu-toggle")) {
            const action = control.getAttribute("aria-expanded") === "true" ? "close" : "open";
            report("menu_toggle", { action });
        } else if (control.matches("summary")) {
            report("project_catalog_tap", { project_id: control.closest(".case-card").id });
        } else {
            trackLink(control, report);
        }
    }

    document.addEventListener("click", trackActivation, { capture: true });
    document.addEventListener("auxclick", trackActivation, { capture: true });
    document.addEventListener("toggle", (event) => {
        const details = event.target;
        if (!details.matches("details[open]")) return;
        const project = details.closest(".case-card[id], [data-project-id]");
        if (!project) return;

        const name = details.matches(".gallery-more") ? "project_screens_expand" : "case_study_open";
        report(name, { project_id: project.dataset.projectId || project.id });
    }, { capture: true });

    const form = document.getElementById("enquiry-form");
    if (form) {
        form.addEventListener("input", () => report("contact_form_start"), { once: true });
        document.addEventListener("submit", (event) => {
            if (event.target === form) report("contact_draft_open");
        }, { capture: true });
    }
}

function trackLink(link, report) {
    const placement = link.closest("section[id], header, footer");
    const placementId = placement?.id || placement?.tagName.toLowerCase() || "page";
    const project = link.closest(".case-card[id], [data-project-id]");
    const projectId = project?.dataset.projectId || project?.id;
    const customEvent = link.dataset.analyticsEvent;
    if (customEvent) {
        const parameters = { placement_id: placementId };
        if (link.dataset.articleId) parameters.article_id = link.dataset.articleId;
        report(customEvent, parameters);
    }

    if (link.getAttribute("href").startsWith("#") && link.hash.length > 1) {
        report("section_tap", { section_id: link.hash.slice(1), placement_id: placementId });
        return;
    }

    if (link.closest(".screen-grid figure, .highlights-grid figure, .feature-screens figure")) {
        const photoId = decodeURIComponent(link.pathname.split("/").pop());
        report("photo_view", { section_id: projectId || placementId, photo_id: photoId });
        return;
    }

    if (link.protocol === "mailto:" && !customEvent) {
        report("contact_email_click", { placement_id: placementId });
        return;
    }

    if (link.hostname === "apps.apple.com" && projectId) {
        report("app_store_click", { project_id: projectId });
        return;
    }

    if (!customEvent && link.protocol === "https:" && link.hostname !== window.location.hostname) {
        const parameters = { destination_host: link.hostname, placement_id: placementId };
        if (projectId) parameters.project_id = projectId;
        report("portfolio_outbound_click", parameters);
    }
}

function trackScroll(onMilestone) {
    const milestones = [25, 50, 75, 100];
    let next = 0;
    let scheduled = false;

    function measureDepth() {
        scheduled = false;
        const page = document.scrollingElement;
        const scrollable = page.scrollHeight - page.clientHeight;
        if (scrollable <= 0 || page.scrollTop <= 0) return;

        while (next < milestones.length && page.scrollTop + 1 >= scrollable * milestones[next] / 100) {
            onMilestone(milestones[next]);
            next += 1;
        }
        if (next === milestones.length) window.removeEventListener("scroll", scheduleMeasurement);
    }

    function scheduleMeasurement() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(measureDepth);
    }

    window.addEventListener("scroll", scheduleMeasurement, { passive: true });
    scheduleMeasurement();
}

initializePortfolioAnalytics().catch((error) => {
    console.warn("Portfolio analytics could not start.", error.message);
});
