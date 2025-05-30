const { readFileSync, writeFileSync, existsSync } = require("node:fs");

(async () => {
    try {
        const user = process.env.GITHUB_USER || "Allyedge";
        const token = process.env.GITHUB_TOKEN;
        const perPage = 100;
        const headers = {
            Accept: "application/vnd.github.v3+json",
            ...(token && { Authorization: `token ${token}` }),
        };

        let allStars = [];
        const oneHourInMs = 60 * 60 * 1000;

        if (existsSync("~/.randomstar/data.json")) {
            try {
                const cachedData = JSON.parse(readFileSync("~/.randomstar/data.json", "utf-8"));
                if (Date.now() - cachedData.timeInserted <= oneHourInMs) {
                    allStars = JSON.parse(cachedData.data);
                }
            } catch (err) {
                console.error("Error reading cache, fetching new data: ", err);
            }
        }

        if (allStars.length === 0) {
            let page = 1;

            while (true) {
                const url = `https://api.github.com/users/${user}/starred?per_page=${perPage}&page=${page}`;
                const res = await fetch(url, { headers });
                if (!res.ok) {
                    console.error(`Error: GitHub API ${res.status} ${res.statusText}`);
                    process.exit(1);
                }

                const stars = await res.json();
                if (!Array.isArray(stars) || stars.length === 0) break;

                allStars.push(...stars);
                if (stars.length < perPage) break;
                page++;
            }

            if (allStars.length === 0) {
                console.error(`No starred repos found for user "${user}".`);
                process.exit(1);
            }
        }

        const data = {
            timeInserted: Date.now(),
            data: JSON.stringify(allStars, null, 4),
        };

        try {
            writeFileSync("~/.randomstar/data.json", JSON.stringify(data, null, 4));
        } catch (err) {
            console.error("Error writing cache file: ", err);
        }

        const repo = allStars[Math.floor(Math.random() * allStars.length)];

        const fields = [
            ["Name", repo.name],
            ["Full Name", repo.full_name],
            ["Description", repo.description || "—"],
            ["Stars", repo.stargazers_count],
            ["Forks", repo.forks_count],
            ["Language", repo.language || "—"],
            ["License", repo.license?.name || "—"],
            ["Topics", (repo.topics || []).join(", ") || "—"],
            ["Created At", new Date(repo.created_at).toLocaleString()],
            ["Last Push", new Date(repo.pushed_at).toLocaleString()],
            ["URL", repo.html_url],
        ];

        const maxLabelLen = fields.reduce(
            (max, [label]) => Math.max(max, label.length),
            0,
        );

        console.log("\n" + "=".repeat(maxLabelLen + 32));
        console.log("  " + "Random Starred Repository\n");

        for (const [label, value] of fields) {
            const paddedLabel = label.padEnd(maxLabelLen);
            console.log(`  ${paddedLabel} : ${value}`);
        }

        console.log("\n" + "=".repeat(maxLabelLen + 32) + "\n");
    } catch (err) {
        console.error("Unexpected error:", err);
        process.exit(1);
    }
})();
