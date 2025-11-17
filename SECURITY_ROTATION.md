# Purge Committed Secrets & Rotate Credentials

This repository previously contained secrets in `backend/.env`. The file has been redacted locally in the repository and an example file `backend/.env.example` was added. You must perform the following steps locally to fully remove secrets from Git history and rotate credentials.

IMPORTANT: These commands rewrite git history. Make a backup of your repository before proceeding.

1) Stop using the compromised credentials
   - If those credentials point to a live MongoDB Atlas cluster, rotate the database user password immediately in Atlas (create a new DB user or change the current user's password) and update your deployment secrets.

2) Untrack the `.env` file and commit the change

   In PowerShell (Windows):

   ```powershell
   cd <path-to-repo>
   git rm --cached backend/.env
   echo "backend/.env" >> backend/.gitignore
   git add backend/.gitignore backend/.env
   git commit -m "Remove committed env file and ignore it"
   git push origin HEAD
   ```

3) Remove sensitive data from git history (choose one method)

   Option A — BFG (easier):
   - Install BFG (https://rtyley.github.io/bfg-repo-cleaner/)
   - Mirror clone and run BFG to remove the secret string(s):

   ```powershell
   git clone --mirror https://github.com/<owner>/<repo>.git
   java -jar bfg.jar --delete-files backend/.env <repo>.git
   cd <repo>.git
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push
   ```

   Option B — git filter-repo (recommended for complex removals):
   - Install `git-filter-repo` (https://github.com/newren/git-filter-repo)

   ```powershell
   git clone --mirror https://github.com/<owner>/<repo>.git
   cd <repo>.git
   git filter-repo --invert-paths --paths backend/.env
   git push --force
   ```

   Note: Replace `<owner>/<repo>` and `<repo>` with your repository details.

4) Rotate all credentials referenced in the removed file
   - In MongoDB Atlas: create a new DB user with a strong password, update connection strings in your deployment (Azure Key Vault / Heroku / Netlify / Vercel / container envs).
   - Change `JWT_SECRET` to a new strong random value (e.g., `openssl rand -base64 32`) and update deployed envs.
   - Change `ADMIN_PASSWORD` to a strong password and store securely.

5) Re-deploy using the new secrets
   - Update CI/CD and hosting environment variables with the new values.

6) Invalidate compromised tokens / sessions
   - If JWT tokens were issued with a short expiry, wait them out or implement token revocation where possible.

7) Audit and monitoring
   - Check MongoDB access logs for suspicious activity.
   - Enable alerts in Atlas for new connections or unusual operations.

If you want, I can prepare a small PR that: (a) creates `backend/.env.example` (already added), (b) adds the `.gitignore` entry (already updated), and (c) updates README with a summary. I cannot run the git-history rewriting commands from here — you'll need to run them locally because they require your credentials and will rewrite history.
