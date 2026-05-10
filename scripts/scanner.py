#!/usr/bin/env python3
"""
SYNKRON Security Scanner
Scans source code for:
  - Hardcoded secrets / API keys / tokens
  - Sensitive data patterns (emails, IPs, private keys)
  - Common vulnerability patterns (SQL injection, eval, exec)
  - Dependency issues (placeholder — extend with pip-audit)

Usage:
  python3 scripts/scanner.py <path> [--json]

Output (JSON):
  {
    "findings": [
      {
        "severity": "critical|high|medium|low|info",
        "type": "secret|vulnerability|sensitive_data|config",
        "file": "src/auth/session.ts",
        "line": 12,
        "column": 5,
        "match": "sk-...",
        "rule": "openai_api_key",
        "description": "OpenAI API key detected in source code",
        "remediation": "Move to environment variable"
      }
    ],
    "summary": {
      "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0,
      "files_scanned": 42,
      "scan_duration_ms": 120
    }
  }
"""

import re
import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any

# ─── Rule Definitions ─────────────────────────────────────────────────────────

RULES: List[Dict[str, Any]] = [
    # ── Critical: Real secrets ──────────────────────────────────────────────
    {
        "id": "openai_api_key",
        "severity": "critical",
        "type": "secret",
        "pattern": r"sk-[A-Za-z0-9]{20,}",
        "description": "OpenAI API key detected in source code",
        "remediation": "Remove from source. Store in environment variable OPENAI_API_KEY.",
    },
    {
        "id": "groq_api_key",
        "severity": "critical",
        "type": "secret",
        "pattern": r"gsk_[A-Za-z0-9]{20,}",
        "description": "Groq API key detected in source code",
        "remediation": "Remove from source. Store in environment variable GROQ_API_KEY.",
    },
    {
        "id": "github_token",
        "severity": "critical",
        "type": "secret",
        "pattern": r"gh[pousr]_[A-Za-z0-9]{36,}",
        "description": "GitHub personal access token detected",
        "remediation": "Revoke this token immediately and regenerate. Store in environment variable.",
    },
    {
        "id": "aws_access_key",
        "severity": "critical",
        "type": "secret",
        "pattern": r"AKIA[0-9A-Z]{16}",
        "description": "AWS Access Key ID detected",
        "remediation": "Revoke in AWS IAM console. Use IAM roles or environment variables.",
    },
    {
        "id": "aws_secret_key",
        "severity": "critical",
        "type": "secret",
        "pattern": r"(?i)aws.{0,20}secret.{0,20}['\"][0-9a-zA-Z/+]{40}['\"]",
        "description": "AWS Secret Access Key detected",
        "remediation": "Revoke in AWS IAM console immediately.",
    },
    {
        "id": "private_key_pem",
        "severity": "critical",
        "type": "secret",
        "pattern": r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "description": "Private key (PEM format) detected in source code",
        "remediation": "Remove immediately. Store private keys in secure key management systems.",
    },
    {
        "id": "jwt_secret_hardcoded",
        "severity": "critical",
        "type": "secret",
        "pattern": r"(?i)(jwt[_\-]?secret|jwt[_\-]?key)\s*[=:]\s*['\"][^'\"]{8,}['\"]",
        "description": "Hardcoded JWT secret detected",
        "remediation": "Move to environment variable. Use a cryptographically random 256-bit secret.",
    },
    {
        "id": "database_url_hardcoded",
        "severity": "critical",
        "type": "secret",
        "pattern": r"(postgres|postgresql|mysql|mongodb)://[^'\"\s]{10,}",
        "description": "Database connection string with credentials detected",
        "remediation": "Move to DATABASE_URL environment variable. Never commit connection strings.",
    },
    # ── High: Likely secrets ────────────────────────────────────────────────
    {
        "id": "generic_api_key",
        "severity": "high",
        "type": "secret",
        "pattern": r"(?i)(api[_\-]?key|apikey|api[_\-]?secret)\s*[=:]\s*['\"][A-Za-z0-9_\-\.]{16,}['\"]",
        "description": "Generic API key assignment detected",
        "remediation": "Move to environment variable. Audit if this key is still valid.",
    },
    {
        "id": "bearer_token",
        "severity": "high",
        "type": "secret",
        "pattern": r"(?i)bearer\s+[A-Za-z0-9\-_\.]{20,}",
        "description": "Bearer token hardcoded in source",
        "remediation": "Remove from source. Tokens should be loaded from environment or secure storage.",
    },
    {
        "id": "password_hardcoded",
        "severity": "high",
        "type": "secret",
        "pattern": r"(?i)(password|passwd|pwd)\s*[=:]\s*['\"][^'\"]{4,}['\"]",
        "description": "Hardcoded password detected",
        "remediation": "Never hardcode passwords. Use environment variables or a secrets manager.",
    },
    # ── Medium: Vulnerability patterns ─────────────────────────────────────
    {
        "id": "eval_usage",
        "severity": "medium",
        "type": "vulnerability",
        "pattern": r"\beval\s*\(",
        "description": "Use of eval() detected — potential code injection risk",
        "remediation": "Replace eval() with safer alternatives. If unavoidable, sanitize all inputs.",
    },
    {
        "id": "sql_injection_risk",
        "severity": "medium",
        "type": "vulnerability",
        "pattern": r"(?i)(query|execute|raw)\s*\(\s*[`'\"].*\$\{",
        "description": "Potential SQL injection via template literal string interpolation",
        "remediation": "Use parameterized queries or ORM methods instead of string interpolation.",
    },
    {
        "id": "dangerouslysetinnerhtml",
        "severity": "medium",
        "type": "vulnerability",
        "pattern": r"dangerouslySetInnerHTML",
        "description": "dangerouslySetInnerHTML usage — potential XSS risk",
        "remediation": "Sanitize HTML with DOMPurify before rendering. Avoid if possible.",
    },
    {
        "id": "console_log_sensitive",
        "severity": "medium",
        "type": "sensitive_data",
        "pattern": r"console\.(log|warn|error|debug)\s*\(.*(?:password|token|secret|key|auth)",
        "description": "Potentially sensitive data being logged to console",
        "remediation": "Remove sensitive data from console logs. Use structured logging with redaction.",
    },
    # ── Low: Config / info issues ───────────────────────────────────────────
    {
        "id": "todo_security",
        "severity": "low",
        "type": "config",
        "pattern": r"(?i)TODO.*(?:security|auth|secret|password|token|fix|hack|vuln)",
        "description": "Security-related TODO comment found",
        "remediation": "Address this TODO before deploying to production.",
    },
    {
        "id": "http_not_https",
        "severity": "low",
        "type": "config",
        "pattern": r"http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9]",
        "description": "Non-HTTPS URL detected (potential MITM risk in production)",
        "remediation": "Use HTTPS for all external URLs in production.",
    },
    {
        "id": "debug_mode",
        "severity": "low",
        "type": "config",
        "pattern": r"(?i)(debug\s*[=:]\s*true|NODE_ENV\s*[=:]\s*['\"]development['\"])",
        "description": "Debug mode or development environment flag detected",
        "remediation": "Ensure debug mode is disabled in production builds.",
    },
    # ── Info: Informational ─────────────────────────────────────────────────
    {
        "id": "fixme_comment",
        "severity": "info",
        "type": "config",
        "pattern": r"(?i)FIXME|HACK|XXX|BUG",
        "description": "Code quality marker found (FIXME/HACK/XXX/BUG)",
        "remediation": "Review and address before production deployment.",
    },
]

# File extensions to scan
SCAN_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".env", ".json", ".yaml", ".yml", ".toml",
    ".sh", ".bash", ".zsh", ".fish",
    ".c", ".h", ".cpp", ".cc",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", ".next", ".git", "dist", "build",
    "__pycache__", ".cache", "coverage", ".turbo",
}

# Files to skip
SKIP_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "*.min.js", "*.min.css",
}


def should_skip(path: Path) -> bool:
    """Return True if this path should be skipped."""
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    if path.name in SKIP_FILES:
        return True
    return False


def scan_file(filepath: Path, rules: List[Dict]) -> List[Dict]:
    """Scan a single file and return all findings."""
    findings = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines()
        for rule in rules:
            pattern = re.compile(rule["pattern"])
            for line_num, line in enumerate(lines, start=1):
                for match in pattern.finditer(line):
                    # Redact the actual matched value for safety
                    matched_text = match.group(0)
                    if len(matched_text) > 20:
                        redacted = matched_text[:6] + "..." + matched_text[-4:]
                    else:
                        redacted = matched_text

                    findings.append({
                        "severity": rule["severity"],
                        "type": rule["type"],
                        "file": str(filepath),
                        "line": line_num,
                        "column": match.start() + 1,
                        "match": redacted,
                        "rule": rule["id"],
                        "description": rule["description"],
                        "remediation": rule["remediation"],
                    })
    except (PermissionError, OSError):
        pass
    return findings


def scan_directory(root: Path, rules: List[Dict]) -> Dict:
    """Scan all eligible files under root."""
    start = time.time()
    all_findings = []
    files_scanned = 0

    for filepath in root.rglob("*"):
        if not filepath.is_file():
            continue
        if should_skip(filepath):
            continue
        if filepath.suffix.lower() not in SCAN_EXTENSIONS:
            continue
        findings = scan_file(filepath, rules)
        all_findings.extend(findings)
        files_scanned += 1

    duration_ms = int((time.time() - start) * 1000)

    summary = {
        "critical": sum(1 for f in all_findings if f["severity"] == "critical"),
        "high": sum(1 for f in all_findings if f["severity"] == "high"),
        "medium": sum(1 for f in all_findings if f["severity"] == "medium"),
        "low": sum(1 for f in all_findings if f["severity"] == "low"),
        "info": sum(1 for f in all_findings if f["severity"] == "info"),
        "files_scanned": files_scanned,
        "scan_duration_ms": duration_ms,
    }

    return {"findings": all_findings, "summary": summary}


def main():
    parser = argparse.ArgumentParser(description="SYNKRON Security Scanner")
    parser.add_argument("path", nargs="?", default=".", help="Directory or file to scan")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--min-severity", default="info",
                        choices=["critical", "high", "medium", "low", "info"],
                        help="Minimum severity to report")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(json.dumps({"error": f"Path not found: {root}"}))
        sys.exit(1)

    result = scan_directory(root, RULES)

    # Filter by minimum severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    min_level = severity_order[args.min_severity]
    result["findings"] = [
        f for f in result["findings"]
        if severity_order.get(f["severity"], 99) <= min_level
    ]

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        s = result["summary"]
        print(f"\n🔍 SYNKRON Security Scanner")
        print(f"   Files scanned : {s['files_scanned']}")
        print(f"   Duration      : {s['scan_duration_ms']}ms")
        print(f"   Critical      : {s['critical']}")
        print(f"   High          : {s['high']}")
        print(f"   Medium        : {s['medium']}")
        print(f"   Low           : {s['low']}")
        print(f"   Info          : {s['info']}")
        print()
        for f in result["findings"]:
            sev = f["severity"].upper().ljust(8)
            print(f"  [{sev}] {f['file']}:{f['line']} — {f['description']}")
            print(f"           Match: {f['match']}")
            print(f"           Fix  : {f['remediation']}")
            print()


if __name__ == "__main__":
    main()
