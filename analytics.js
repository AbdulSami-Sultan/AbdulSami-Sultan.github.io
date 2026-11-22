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
    trackClicks(report);
}

function trackViews(report) {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
        for (const { target, isIntersecting, intersectionRatio } of entries) {
            if (!isIntersecting || intersectionRatio < 0.5) continue;
            observer.unobserve(target);

            const project = target.closest(".case-card[id]");
            if (project) {
                report("case_study_view", { project_id: project.id });
            } else {
                const section = target.closest("section[id]");
                report(target.dataset.analyticsView || "testimonial_view", { section_id: section.id });
            }
        }
    }, { threshold: 0.5 });

    document.querySelectorAll("[data-project-heading], [data-analytics-view], #testimonials h2")
        .forEach((target) => observer.observe(target));
}

function trackClicks(report) {
    function trackLink(event) {
        if (event.type === "auxclick" && event.button !== 1) return;
        const link = event.target.closest("a[href], summary[data-project-heading]");
        if (!link) return;

        if (link.matches("summary")) {
            report("project_catalog_tap", { project_id: link.closest(".case-card").id });
            return;
        }

        const customEvent = link.dataset.analyticsEvent;
        if (customEvent) {
            const articleId = link.dataset.articleId;
            report(customEvent, articleId ? { article_id: articleId } : undefined);
        }

        if (link.getAttribute("href").startsWith("#") && link.hash.length > 1) {
            report("section_tap", { section_id: link.hash.slice(1) });
        }

        const photo = link.closest(".screen-grid figure, .highlights-grid figure, .feature-screens figure");
        if (photo) {
            const owner = photo.closest(".case-card[id], [data-project-id], section[id]");
            report("photo_view", { section_id: owner.dataset.projectId || owner.id, photo_id: decodeURIComponent(link.pathname.split("/").pop()) });
        }

        if (link.hostname === "apps.apple.com") {
            const project = link.closest(".case-card[id]");
            if (project) report("app_store_click", { project_id: project.id });
        }
    }

    document.addEventListener("click", trackLink, { capture: true });
    document.addEventListener("auxclick", trackLink, { capture: true });
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
