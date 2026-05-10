#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <iomanip>

// Internal C++ function simulating dynamic AST logic hashing via Tree-sitter.
// In complete production, this would #include "tree-sitter/api.h"
// and iterate TSNode cursor to produce a language-agnostic logic canonicalization.

extern "C" {

    // Opaque wrapper for a hash vector, serializable to JSON string
    const char* compute_logic_hash(const char* source_code, const char* lang) {
        std::string code(source_code);
        std::string language(lang);
        
        // We "canonicalize" by removing whitespace and comments to form a "logic hash"
        // This is what tree-sitter helps extract (just the syntax tree structure)
        std::string canonical;
        bool in_comment = false;
        
        for(size_t i = 0; i < code.length(); ++i) {
            if(!in_comment && i + 1 < code.length() && code[i] == '/' && code[i+1] == '/') {
                in_comment = true;
                continue;
            }
            if(in_comment && code[i] == '\n') {
                in_comment = false;
                continue;
            }
            if(!in_comment && !isspace(code[i])) {
                canonical += code[i];
            }
        }
        
        // Basic FNV-1a hash implementation for string stability
        unsigned long long hash = 0xcbf29ce484222325ULL;
        for (char c : canonical) {
            hash ^= (unsigned char)c;
            hash *= 0x100000001b3ULL;
        }
        
        std::stringstream ss;
        ss << "{\"language\":\"" << language << "\",\"logic_hash\":\"" 
           << std::hex << std::setw(16) << std::setfill('0') << hash << "\"}";
           
        std::string result = ss.str();
        
        // Allocate memory for the return string so Rust can receive it.
        // Note: Freeing needs to be managed by a separate function exposed here.
        char* ret = (char*)malloc(result.length() + 1);
        strcpy(ret, result.c_str());
        return ret;
    }

    void free_string(char* ptr) {
        free(ptr);
    }
}
