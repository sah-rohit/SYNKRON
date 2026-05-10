/*
 * Ostinato File Integrity Hasher
 * Fast SHA-256 file hashing in C for change detection.
 *
 * Computes SHA-256 of every file under a directory and outputs
 * a JSON manifest. Used by the security scanner to detect
 * unexpected file modifications (integrity checking).
 *
 * Build:
 *   gcc -O2 -o scripts/hasher scripts/hasher.c -lssl -lcrypto
 *   # or on macOS:
 *   gcc -O2 -o scripts/hasher scripts/hasher.c -I/opt/homebrew/include -L/opt/homebrew/lib -lssl -lcrypto
 *
 * Usage:
 *   ./scripts/hasher <directory>
 *
 * Output (JSON):
 *   {
 *     "files": [
 *       { "path": "src/lib/auth/session.ts", "sha256": "abc123...", "size": 1234 }
 *     ],
 *     "total_files": 42,
 *     "duration_ms": 15
 *   }
 *
 * NOTE: If OpenSSL is not available, the build will fail gracefully.
 * The Next.js API route falls back to the Python scanner in that case.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sys/stat.h>
#include <dirent.h>
#include <openssl/sha.h>

#define MAX_PATH 4096
#define HASH_HEX_LEN 65   /* 32 bytes * 2 hex chars + null */
#define MAX_FILES 65536

typedef struct {
    char path[MAX_PATH];
    char sha256[HASH_HEX_LEN];
    long size;
} FileEntry;

static FileEntry *entries = NULL;
static int entry_count = 0;

/* Directories to skip */
static const char *SKIP_DIRS[] = {
    "node_modules", ".next", ".git", "dist", "build",
    "__pycache__", ".cache", "coverage", NULL
};

static int should_skip_dir(const char *name) {
    for (int i = 0; SKIP_DIRS[i] != NULL; i++) {
        if (strcmp(name, SKIP_DIRS[i]) == 0) return 1;
    }
    return 0;
}

static int compute_sha256(const char *filepath, char *out_hex, long *out_size) {
    FILE *f = fopen(filepath, "rb");
    if (!f) return 0;

    SHA256_CTX ctx;
    SHA256_Init(&ctx);

    unsigned char buf[65536];
    size_t n;
    long total = 0;
    while ((n = fread(buf, 1, sizeof(buf), f)) > 0) {
        SHA256_Update(&ctx, buf, n);
        total += (long)n;
    }
    fclose(f);

    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_Final(hash, &ctx);

    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        sprintf(out_hex + i * 2, "%02x", hash[i]);
    }
    out_hex[HASH_HEX_LEN - 1] = '\0';
    *out_size = total;
    return 1;
}

static void scan_dir(const char *base, const char *rel) {
    char full[MAX_PATH];
    if (rel[0] == '\0') {
        snprintf(full, sizeof(full), "%s", base);
    } else {
        snprintf(full, sizeof(full), "%s/%s", base, rel);
    }

    DIR *d = opendir(full);
    if (!d) return;

    struct dirent *ent;
    while ((ent = readdir(d)) != NULL) {
        if (ent->d_name[0] == '.') continue;

        char child_rel[MAX_PATH];
        if (rel[0] == '\0') {
            snprintf(child_rel, sizeof(child_rel), "%s", ent->d_name);
        } else {
            snprintf(child_rel, sizeof(child_rel), "%s/%s", rel, ent->d_name);
        }

        char child_full[MAX_PATH];
        snprintf(child_full, sizeof(child_full), "%s/%s", full, ent->d_name);

        struct stat st;
        if (stat(child_full, &st) != 0) continue;

        if (S_ISDIR(st.st_mode)) {
            if (!should_skip_dir(ent->d_name)) {
                scan_dir(base, child_rel);
            }
        } else if (S_ISREG(st.st_mode)) {
            if (entry_count >= MAX_FILES) continue;
            FileEntry *e = &entries[entry_count];
            strncpy(e->path, child_rel, MAX_PATH - 1);
            if (compute_sha256(child_full, e->sha256, &e->size)) {
                entry_count++;
            }
        }
    }
    closedir(d);
}

int main(int argc, char *argv[]) {
    const char *dir = (argc > 1) ? argv[1] : ".";

    entries = (FileEntry *)malloc(MAX_FILES * sizeof(FileEntry));
    if (!entries) {
        fprintf(stderr, "{\"error\": \"Out of memory\"}\n");
        return 1;
    }

    struct timespec t0, t1;
    clock_gettime(CLOCK_MONOTONIC, &t0);

    scan_dir(dir, "");

    clock_gettime(CLOCK_MONOTONIC, &t1);
    long duration_ms = (t1.tv_sec - t0.tv_sec) * 1000 +
                       (t1.tv_nsec - t0.tv_nsec) / 1000000;

    /* Output JSON */
    printf("{\n  \"files\": [\n");
    for (int i = 0; i < entry_count; i++) {
        /* Escape backslashes and quotes in path */
        printf("    {\"path\": \"");
        for (const char *p = entries[i].path; *p; p++) {
            if (*p == '"' || *p == '\\') putchar('\\');
            putchar(*p);
        }
        printf("\", \"sha256\": \"%s\", \"size\": %ld}",
               entries[i].sha256, entries[i].size);
        if (i < entry_count - 1) printf(",");
        printf("\n");
    }
    printf("  ],\n");
    printf("  \"total_files\": %d,\n", entry_count);
    printf("  \"duration_ms\": %ld\n", duration_ms);
    printf("}\n");

    free(entries);
    return 0;
}
