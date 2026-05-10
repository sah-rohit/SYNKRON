fn main() {
    // Compile our C++ FFI component
    cc::Build::new()
        .cpp(true)
        .file("src/ast_hasher.cpp")
        .flag_if_supported("-std=c++17")
        .compile("ast_hasher");

    // Proceed with standard Tauri build
    tauri_build::build();
}
