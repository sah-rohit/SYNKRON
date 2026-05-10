use std::ffi::c_void;

#[cfg(windows)]
mod win32 {
    use std::ffi::c_void;

    unsafe extern "system" {
        pub fn VirtualAlloc(
            lpAddress: *const c_void,
            dwSize: usize,
            flAllocationType: u32,
            flProtect: u32,
        ) -> *mut c_void;

        pub fn VirtualFree(
            lpAddress: *mut c_void,
            dwSize: usize,
            dwFreeType: u32,
        ) -> i32;
    }

    pub const MEM_COMMIT: u32 = 0x1000;
    pub const MEM_RESERVE: u32 = 0x2000;
    pub const MEM_RELEASE: u32 = 0x8000;
    pub const PAGE_EXECUTE_READWRITE: u32 = 0x40;
}

pub struct JitEngine {
    exec_mem: *mut c_void,
    _size: usize,
}

impl JitEngine {
    pub fn new() -> Result<Self, String> {
        let size = 4096;
        #[cfg(windows)]
        {
            unsafe {
                let mem = win32::VirtualAlloc(
                    std::ptr::null(),
                    size,
                    win32::MEM_COMMIT | win32::MEM_RESERVE,
                    win32::PAGE_EXECUTE_READWRITE,
                );
                if mem.is_null() {
                    return Err("Failed to allocate executable memory via VirtualAlloc".to_string());
                }
                Ok(JitEngine { exec_mem: mem, _size: size })
            }
        }
        #[cfg(not(windows))]
        {
            Err("JIT JIT backend is only supported on Windows in this implementation".to_string())
        }
    }

    pub fn compile_and_run(&self, registers: &mut [f64; 256]) {
        // x86-64 machine code for hot loop execution:
        // R0 = registers[0], R1 = registers[1], R2 = registers[2]
        // loop {
        //   if R0 >= R1 { break; }
        //   R0 = R0 + R2;
        // }
        let code: [u8; 31] = [
            0xf2, 0x0f, 0x10, 0x01,             // movsd xmm0, [rcx]       (load R0)
            0xf2, 0x0f, 0x10, 0x49, 0x08,       // movsd xmm1, [rcx + 8]   (load R1)
            0xf2, 0x0f, 0x10, 0x51, 0x10,       // movsd xmm2, [rcx + 16]  (load R2)
            // Loop Start:
            0x66, 0x0f, 0x2f, 0xc1,             // comisd xmm0, xmm1       (compare R0 and R1)
            0x73, 0x06,                         // jae LoopEnd             (jump 6 bytes if R0 >= R1)
            0xf2, 0x0f, 0x58, 0xc2,             // addsd xmm0, xmm2        (R0 = R0 + R2)
            0xeb, 0xf4,                         // jmp LoopStart           (jump 12 bytes back)
            // Loop End:
            0xf2, 0x0f, 0x11, 0x01,             // movsd [rcx], xmm0       (save R0)
            0xc3,                               // ret                     (return)
        ];

        unsafe {
            // Copy code into executable memory
            std::ptr::copy_nonoverlapping(code.as_ptr(), self.exec_mem as *mut u8, code.len());

            // Cast memory to function pointer with Windows x64 calling convention
            // On Windows, the first argument (pointer to registers) is passed in RCX.
            type JitFunc = unsafe extern "C" fn(*mut f64);
            let jit_func: JitFunc = std::mem::transmute(self.exec_mem);

            // Execute the JIT function!
            jit_func(registers.as_mut_ptr());
        }
    }
}

impl Drop for JitEngine {
    fn drop(&mut self) {
        #[cfg(windows)]
        unsafe {
            if !self.exec_mem.is_null() {
                win32::VirtualFree(self.exec_mem, 0, win32::MEM_RELEASE);
            }
        }
    }
}
unsafe impl Send for JitEngine {}
unsafe impl Sync for JitEngine {}
