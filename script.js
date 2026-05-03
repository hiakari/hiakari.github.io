const FALLBACK_PROJECTS = [
  "projects/neural-receivers.md",
  "projects/otfs-ofdm.md"
];

const emailUser = "nhatminhnguyenduc670";
const emailDomain = "gmail.com";

let projects = [];

document.addEventListener("DOMContentLoaded", async () => {
  wireEmailLinks();
  wireTabs();
  wireSidebarToggle();
  await loadProjects();
});

function wireEmailLinks() {
  document.querySelectorAll("[data-email-link]").forEach((link) => {
    link.href = `mailto:${emailUser}@${emailDomain}`;
  });
}

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-tab-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showTab(link.dataset.tabLink);
    });
  });

  const initialTab = window.location.hash.replace("#", "") || "home";
  if (document.getElementById(initialTab) && document.querySelector(`[data-tab="${initialTab}"]`)) {
    showTab(initialTab, false);
  }
}

function wireSidebarToggle() {
  const toggle = document.querySelector(".sidebar-toggle");
  const layout = document.querySelector(".projects-layout");
  const sidebar = document.getElementById("project-sidebar");
  if (!toggle || !layout || !sidebar) return;

  toggle.addEventListener("click", () => {
    const collapsed = layout.classList.toggle("is-sidebar-hidden");
    sidebar.hidden = collapsed;
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = collapsed ? "Show sidebar" : "Hide sidebar";
    toggle.setAttribute("aria-label", collapsed ? "Show sidebar" : "Hide sidebar");
    toggle.innerHTML = collapsed ? '<span aria-hidden="true">○</span>' : '<span aria-hidden="true">×</span>';
  });
}

function showTab(tabName, updateHash = true) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === tabName);
  });

  if (updateHash) {
    history.replaceState(null, "", `#${tabName}`);
  }
}

async function loadProjects() {
  const paths = await discoverProjectPaths();
  const loaded = await Promise.all(paths.map(loadProject));
  projects = loaded
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  renderProjectList();
  renderRecentProjects();

  if (projects[0]) {
    renderProject(projects[0].slug);
  }
}

async function discoverProjectPaths() {
  const githubPaths = await discoverProjectPathsFromGitHub();
  return githubPaths.length ? githubPaths : FALLBACK_PROJECTS;
}

async function discoverProjectPathsFromGitHub() {
  if (!location.hostname.endsWith("github.io")) {
    return [];
  }

  const owner = location.hostname.replace(".github.io", "");
  const repo = `${owner}.github.io`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/projects`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return [];
    const files = await response.json();
    return files
      .filter((file) => file.type === "file" && file.name.endsWith(".md"))
      .map((file) => file.path);
  } catch {
    return [];
  }
}

async function loadProject(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const markdown = await response.text();
    const { metadata, body } = parseFrontMatter(markdown);
    const slug = path.split("/").pop().replace(/\.md$/, "");

    return {
      slug,
      path,
      title: metadata.title || titleFromSlug(slug),
      date: metadata.date || "",
      summary: metadata.summary || "",
      code: metadata.code || "",
      report: metadata.report || "",
      body
    };
  } catch {
    return null;
  }
}

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { metadata: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { metadata: {}, body: markdown };
  }

  const rawMetadata = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4).trim();
  const metadata = {};

  rawMetadata.split("\n").forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    metadata[key] = value;
  });

  return { metadata, body };
}

function renderProjectList() {
  const container = document.getElementById("project-list");
  container.innerHTML = projects.map(projectCard).join("");
  container.querySelectorAll("[data-project-select]").forEach((button) => {
    button.addEventListener("click", () => renderProject(button.dataset.projectSelect));
  });
}

function renderRecentProjects() {
  const container = document.getElementById("recent-projects");
  container.innerHTML = projects.slice(0, 2).map(projectCard).join("");
  container.querySelectorAll("[data-project-select]").forEach((button) => {
    button.addEventListener("click", () => {
      showTab("projects");
      renderProject(button.dataset.projectSelect);
    });
  });
}

function projectCard(project) {
  const actions = [
    projectAction("Code", project.code),
    projectAction("Report", project.report)
  ].join("");

  return `
    <article class="project-card" data-project="${escapeHtml(project.slug)}">
      <button class="project-select" type="button" data-project-select="${escapeHtml(project.slug)}">
        <span class="project-date">${escapeHtml(project.date || "Project")}</span>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.summary || "Markdown project/blog post")}</p>
      </button>
      <div class="card-actions">${actions}</div>
    </article>
  `;
}

function projectAction(label, href) {
  if (href) {
    return `<a class="card-link" href="${escapeHtml(href)}">${label}</a>`;
  }

  return `<span class="card-link is-disabled" aria-disabled="true">${label}</span>`;
}

function renderProject(slug) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return;

  document.querySelectorAll(".project-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.project === slug);
  });

  const links = [
    project.code ? `**Code:** [Open code](${project.code})` : "**Code:** _Add link in markdown front matter_",
    project.report ? `**Report:** [Open report](${project.report})` : "**Report:** _Add link in markdown front matter_"
  ].join("\n\n");

  const markdown = `# ${project.title}\n\n${links}\n\n${project.body}`;
  const renderer = window.marked
    ? window.marked.parse(markdown, { gfm: true, breaks: false })
    : basicMarkdown(markdown);

  document.getElementById("project-content").innerHTML = renderer;
  renderMath();
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function basicMarkdown(markdown) {
  return markdown
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("# ")) return `<h1>${escapeHtml(block.slice(2))}</h1>`;
      if (block.startsWith("## ")) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
      return `<p>${escapeHtml(block)}</p>`;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([document.getElementById("project-content")]);
  }
}
