const axios = require("axios");

/**
 * This function initializes the GitHub app and sets up event listeners for "issue_comment.created" and "pull_request.opened" events.
 *
 * @param {Object} app - The GitHub app instance.
 */
module.exports = (app) => {
  // Log a message to indicate that the app was loaded
  app.log.info("Yay, the app was loaded!");

  /**
   * Event listener for "issue_comment.created" and "pull_request.opened" events.
   *
   * @param {Object} context - The event context.
   */
  app.on(["issue_comment.created", "pull_request.opened"], async (context) => {
    console.log("Checkpoint 1: Starting execution");
    console.log("Checkpoint 1.2: Payload:", context.payload);

    const { comment, issue } = context.payload;

    // Check if the comment or commit message contains the specific command ("/execute")
    if (comment.body.includes("/execute")) {
      console.log("Checkpoint 2: Command '/execute' detected");

      // Retrieve the code from the pull request
      const code = await getCodeFromPullRequest(context, context.payload);
      console.log("Code:", code);

      // Execute the code using the Piston API
      const output = await executeCodeWithPiston(code);
      console.log("Output:", output);

      // Post the output as a comment on the pull request
      await createCommentOnPullRequest(context, context.payload, output);
    }
  });

  /**
   * Retrieves code from the pull request.
   *
   * @param {Object} context - The event context.
   * @param {Object} Issue - The issue object from the payload.
   * @returns {string} - The code from the pull request.
   */
  async function getCodeFromPullRequest(context, Issue) {
    console.log("Checkpoint 3: Retrieving code from pull request");
    console.log("Checkpoint 3.2: Issue:", Issue);

    try {
      const owner = Issue.repository.owner.login;
      const repo = Issue.repository.name;
      const pull_number = Issue.issue.number;

      const { data } = await context.octokit.pulls.get({
        owner: owner,
        repo: repo,
        pull_number: pull_number,
      });
      console.log("Checkpoint 3.3: Data:", data);
      console.log("Checkpoint 3.4: Data.body:", data.body);

      return data.body;
    } catch (error) {
      console.error("Error retrieving code from pull request:", error);
      return "";
    }
  }

  /**
   * Executes the code using the Piston API.
   *
   * @param {string} code - The code to be executed.
   * @returns {string} - The output of the executed code.
   */
  async function executeCodeWithPiston(code) {
    console.log("Checkpoint 4: Executing code with Piston API");
    try {
      const { default: piston } = await import("piston-client");
      const client = piston({ server: "https://emkc.org" });
      const result = await client.execute("javascript", code);
      console.log("Output:", result.run.stdout);

      return result.run.stdout || result.run.stderr || "";
    } catch (error) {
      console.error("Error executing code with Piston API:", error);
      return "";
    }
  }

  /**
   * Creates a comment on the pull request.
   *
   * @param {Object} context - The event context.
   * @param {Object} Issue - The issue object from the payload.
   * @param {string} comment - The comment to be posted.
   */
  async function createCommentOnPullRequest(context, Issue, comment) {
    console.log("Checkpoint 5: Creating comment on pull request");
    console.log("Checkpoint 5.2: Issue:", Issue);

    try {
      const owner = Issue.repository.owner.login;
      const repo = Issue.repository.name;

      await context.octokit.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: Issue.issue.number,
        body: comment,
      });
    } catch (error) {
      console.error("Error creating comment on pull request:", error);
    }
  }
};
