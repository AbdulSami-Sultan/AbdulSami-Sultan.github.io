async function initializePortfolioAnalytics() {
    const { default: firebaseConfig } = await import("./firebase-config.generated.js").catch(() => ({}));
    if (!firebaseConfig) return;

    const requiredFields = ["apiKey", "projectId", "appId", "measurementId"];
    if (requiredFields.some((field) => !firebaseConfig[field].trim())) return;

    const [{ initializeApp }, { getAnalytics, isSupported, logEvent }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/13.4.0/firebase-analytics.js"),
    ]);
    if (!(await isSupported())) return;

    const analytics = getAnalytics(initializeApp(firebaseConfig));
    trackScroll((percent) => logEvent(analytics, "portfolio_scroll_depth", { depth_percent: percent }));

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
                observer.unobserve(entry.target);
                logEvent(analytics, "case_study_view", { project_id: entry.target.closest(".case-card").id });
            }
        }, { threshold: 0.5 });

        document.querySelectorAll(".case-card[id] h3").forEach((heading) => observer.observe(heading));
    }

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link || link.hostname !== "apps.apple.com") return;
        const project = link.closest(".case-card[id], .project-card[id]");
        if (project) logEvent(analytics, "app_store_click", { project_id: project.id });
    }, { capture: true });
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
