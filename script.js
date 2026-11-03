
const STORAGE_KEY = "pedro_vault_websites";

let websites = loadWebsites();
let editingId = null;

const form = document.getElementById("websiteForm");
const nameInput = document.getElementById("siteName");
const urlInput = document.getElementById("siteUrl");
const descriptionInput = document.getElementById("siteDescription");
const categoryInput = document.getElementById("siteCategory");

const websiteList = document.getElementById("websiteList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const favoritesOnly = document.getElementById("favoritesOnly");

const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");

// Load saved websites
function loadWebsites() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];

        return Array.isArray(data) ? data.filter(site =>
            site &&
            typeof site.name === "string" &&
            typeof site.url === "string" &&
            typeof site.id === "string" &&
            isValidUrl(site.url)
        ) : [];
    } catch {
        return [];
    }
}

// Save websites
function saveWebsites() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
    } catch (error) {
        alert("Could not save data. Storage may be full.");
        console.error(error);
    }
}

// Validate website URL
function normalizeUrl(value) {
    let url = value.trim();

    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }

    try {
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return null;
        }

        if (!parsed.hostname.includes(".")) {
            return null;
        }

        return parsed.href;
    } catch {
        return null;
    }
}

function isValidUrl(value) {
    try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol)
            && parsed.hostname.includes(".");
    } catch {
        return false;
    }
}

// Create unique ID
function createId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(16).slice(2);
}

// Create safe HTML elements
function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

// Render websites
function renderWebsites() {
    websiteList.replaceChildren();

    const search = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    let filtered = websites.filter(site => {
        const matchesSearch =
            site.name.toLowerCase().includes(search) ||
            site.url.toLowerCase().includes(search) ||
            (site.description || "").toLowerCase().includes(search);

        const matchesCategory =
            selectedCategory === "All" ||
            site.category === selectedCategory;

        const matchesFavorite =
            !favoritesOnly.checked || site.favorite;

        return matchesSearch && matchesCategory && matchesFavorite;
    });

    if (sortFilter.value === "newest") {
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortFilter.value === "oldest") {
        filtered.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortFilter.value === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (filtered.length === 0) {
        websiteList.appendChild(
            makeElement("div", "empty-state",
                websites.length === 0
                    ? "Your library is empty. Add your first website!"
                    : "No websites found.")
        );
    }

    filtered.forEach(site => {
        const card = makeElement("article", "website-card");

        const top = makeElement("div", "card-top");
        const title = makeElement("h3", "", site.name);

        const favoriteBtn = makeElement(
            "button",
            "favorite-btn",
            site.favorite ? "★" : "☆"
        );

        favoriteBtn.type = "button";
        favoriteBtn.title = "Toggle favorite";

        favoriteBtn.addEventListener("click", () => {
            site.favorite = !site.favorite;
            saveWebsites();
            renderWebsites();
        });

        top.append(title, favoriteBtn);

        const category = makeElement(
            "span", "category", site.category
        );

        const description = makeElement(
            "p", "description",
            site.description || "No description added."
        );

        const link = makeElement("a", "site-url", site.url);
        link.href = site.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "Open website in a new tab";

        const actions = makeElement("div", "card-actions");

        const openBtn = makeElement("a", "", "Open website");
        openBtn.href = site.url;
        openBtn.target = "_blank";
        openBtn.rel = "noopener noreferrer";

        const editBtn = makeElement("button", "", "Edit");
        editBtn.type = "button";
        editBtn.addEventListener("click", () => editWebsite(site.id));

        const deleteBtn = makeElement("button", "delete", "Delete");
        deleteBtn.type = "button";
        deleteBtn.addEventListener("click", () => deleteWebsite(site.id));

        actions.append(openBtn, editBtn, deleteBtn);
        card.append(top, category, description, link, actions);

        websiteList.appendChild(card);
    });

    updateStats();
}

// Update statistics
function updateStats() {
    document.getElementById("totalCount").textContent =
        websites.length;

    document.getElementById("favoriteCount").textContent =
        websites.filter(site => site.favorite).length;

    document.getElementById("categoryCount").textContent =
        new Set(websites.map(site => site.category)).size;
}

// Add or update website
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const url = normalizeUrl(urlInput.value);
    const description = descriptionInput.value.trim();
    const category = categoryInput.value;

    if (!name || !url) {
        alert("Please enter a valid name and URL.");
        return;
    }

    if (editingId) {
        const site = websites.find(item => item.id === editingId);

        if (site) {
            site.name = name;
            site.url = url;
            site.description = description;
            site.category = category;
        }
    } else {
        websites.unshift({
            id: createId(),
            name,
            url,
            description,
            category,
            favorite: false,
            createdAt: Date.now()
        });
    }

    saveWebsites();
    resetForm();
    renderWebsites();
});

// Edit website
function editWebsite(id) {
    const site = websites.find(item => item.id === id);
    if (!site) return;

    editingId = id;

    nameInput.value = site.name;
    urlInput.value = site.url;
    descriptionInput.value = site.description || "";
    categoryInput.value = site.category;

    submitBtn.textContent = "Update website";
    cancelEdit.classList.remove("hidden");

    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Delete website
function deleteWebsite(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this website?"
    );

    if (!confirmed) return;

    websites = websites.filter(site => site.id !== id);

    saveWebsites();
    resetForm();
    renderWebsites();
}

// Reset form
function resetForm() {
    form.reset();
    editingId = null;
    submitBtn.textContent = "+ Save website";
    cancelEdit.classList.add("hidden");
}

cancelEdit.addEventListener("click", resetForm);

// Search and filters
searchInput.addEventListener("input", renderWebsites);
categoryFilter.addEventListener("change", renderWebsites);
sortFilter.addEventListener("change", renderWebsites);
favoritesOnly.addEventListener("change", renderWebsites);

// Export backup
document.getElementById("exportBtn").addEventListener("click", () => {
    const backup = {
        app: "PEDRO VAULT",
        version: 1,
        exportedAt: new Date().toISOString(),
        websites
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "pedro-vault-backup.json";
    link.click();

    URL.revokeObjectURL(downloadUrl);
});

// Import backup
const importFile = document.getElementById("importFile");

document.getElementById("importBtn").addEventListener("click", () => {
    importFile.click();
});

importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    if (!file) return;

    try {
        const content = await file.text();
        const backup = JSON.parse(content);

        if (!backup || !Array.isArray(backup.websites)) {
            throw new Error("Invalid backup file.");
        }

        const imported = backup.websites.filter(site =>
            site &&
            typeof site.name === "string" &&
            typeof site.url === "string" &&
            isValidUrl(site.url)
        );

        if (!confirm(
            "Import " + imported.length +
            " websites? Existing websites will be kept."
        )) {
            importFile.value = "";
            return;
        }

        const existingIds = new Set(websites.map(site => site.id));

        imported.forEach(site => {
            const id = createId();

            websites.push({
                id,
                name: site.name,
                url: site.url,
                description: typeof site.description === "string"
                    ? site.description : "",
                category: [
                    "Cybersecurity", "CTF", "AI",
                    "Tools", "Learning", "Other"
                ].includes(site.category) ? site.category : "Other",
                favorite: site.favorite === true,
                createdAt: Number.isFinite(site.createdAt)
                    ? site.createdAt : Date.now()
            });
        });

        saveWebsites();
        renderWebsites();
        alert("Backup imported successfully!");

    } catch (error) {
        alert("Could not import this backup file.");
        console.error(error);
    }

    importFile.value = "";
});

// Initial display
renderWebsites();
