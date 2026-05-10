// Copy from jit.rs
use std::ffi::c_void;

#[cfg(windows)]
mod win32 {
    use std::ffi::c_void;
    unsafe extern "system" {
        pub fn VirtualAlloc(lpAddr: *const c_void, size: usize, alloc_t: u32, prot: u32) -> *mut c_void;
        pub fn VirtualFree(lpAddr: *mut c_void, size: usize, free_t: u32) -> i32;
    }
    pub const MEM_COMMIT: u32 = 0x1000;
    pub const MEM_RESERVE: u32 = 0x2000;
    pub const MEM_RELEASE: u32 = 0x8000;
    pub const PAGE_EXECUTE_READWRITE: u32 = 0x40;
}

pub struct JitEngine { exec_mem: *mut c_void, _size: usize }

impl JitEngine {
    pub fn new() -> Result<Self, String> {
        let size = 4096;
        #[cfg(windows)]
        unsafe {
            let mem = win32::VirtualAlloc(std::ptr::null(), size, win32::MEM_COMMIT | win32::MEM_RESERVE, win32::PAGE_EXECUTE_READWRITE);
            if mem.is_null() { return Err("JIT mem alloc failed".into()); }
            Ok(JitEngine { exec_mem: mem, _size: size })
        }
        #[cfg(not(windows))]
        Err("JIT only supported on Windows in this setup".into())
    }

    pub fn compile_and_run(&self, registers: &mut [f64; 256]) {
        // Machine code for fast incremental loop on xmm registers
        let code: [u8; 31] = [
            0xf2, 0x0f, 0x10, 0x01,
            0xf2, 0x0f, 0x10, 0x49, 0x08,
            0xf2, 0x0f, 0x10, 0x51, 0x10,
            0x66, 0x0f, 0x2f, 0xc1,
            0x73, 0x06,
            0xf2, 0x0f, 0x58, 0xc2,
            0xeb, 0xf4,
            0xf2, 0x0f, 0x11, 0x01,
            0xc3,
        ];
        unsafe {
            std::ptr::copy_nonoverlapping(code.as_ptr(), self.exec_mem as *mut u8, code.len());
            type JitFunc = unsafe extern "C" fn(*mut f64);
            let jit_func: JitFunc = std::mem::transmute(self.exec_mem);
            jit_func(registers.as_mut_ptr());
        }
    }
}
impl Drop for JitEngine {
    fn drop(&mut self) {
        #[cfg(windows)]
        unsafe { if !self.exec_mem.is_null() { win32::VirtualFree(self.exec_mem, 0, win32::MEM_RELEASE); } }
    }
}
unsafe impl Send for JitEngine {}
unsafe impl Sync for JitEngine {}
