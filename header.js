// When the page loads, add the .active class to the correct href so the CSS can highlight it
 window.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    document.querySelectorAll("header nav a").forEach(link => {
        const href = link.getAttribute("href");

        // For Admin /services, match any path that starts with /services
        if (href === "/" && currentPath === "/") {
            link.classList.add("active");
        } else if (href !== "/" && currentPath.startsWith(href)) {
            link.classList.add("active");
        }
    });
});