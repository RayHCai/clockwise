/**
 * Patches @elevenlabs/client to handle malformed error events.
 * The SDK crashes with "Cannot read properties of undefined (reading 'error_type')"
 * when the server sends an error event without an error_event payload.
 *
 * This can be removed once @elevenlabs/client ships a fix.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@elevenlabs",
  "client",
  "dist",
  "BaseConversation.js"
);

if (!fs.existsSync(filePath)) {
  console.log("[patch-elevenlabs] BaseConversation.js not found, skipping.");
  process.exit(0);
}

let src = fs.readFileSync(filePath, "utf8");

const buggy = "const errorType = event.error_event.error_type;";
if (!src.includes(buggy)) {
  console.log("[patch-elevenlabs] Already patched or code changed, skipping.");
  process.exit(0);
}

const patched = src.replace(
  `    handleErrorEvent(event) {
        const errorType = event.error_event.error_type;
        const message = event.error_event.message || event.error_event.reason || "Unknown error";`,
  `    handleErrorEvent(event) {
        const errorEvent = event.error_event;
        if (!errorEvent) {
            console.error("ElevenLabs: received error event with no error_event payload:", JSON.stringify(event));
            this.onError("Server error: unknown (malformed error event)", event);
            return;
        }
        const errorType = errorEvent.error_type;
        const message = errorEvent.message || errorEvent.reason || "Unknown error";`
);

// Also fix the references further down in the same function
const patched2 = patched.replace(
  `        this.onError(\`Server error: \${message}\`, {
            errorType,
            code: event.error_event.code,
            debugMessage: event.error_event.debug_message,
            details: event.error_event.details,
        });`,
  `        this.onError(\`Server error: \${message}\`, {
            errorType,
            code: errorEvent.code,
            debugMessage: errorEvent.debug_message,
            details: errorEvent.details,
        });`
);

fs.writeFileSync(filePath, patched2, "utf8");
console.log("[patch-elevenlabs] Patched handleErrorEvent successfully.");
