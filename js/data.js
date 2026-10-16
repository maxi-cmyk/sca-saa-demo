/*
 * data.js — the synthetic "capture" of malware samples used by the demo.
 *
 * EVERYTHING HERE IS FICTIONAL. No real malware, hashes, domains or code.
 * Domains use the reserved .example TLD (RFC 2606).
 *
 * Each sample has two feature sets, following the paper's framework (Eq. 2):
 *   code  -> input to Shared Code Analysis (SCA): function-level code fragments
 *            (in a real pipeline these come from disassembly / byte blocks).
 *   The integrated code score uses cosine over synthetic byte-block counts.
 *   attrs -> input to Shared Attribute Analysis (SAA): APIs, network indicators,
 *            mutexes, registry keys, files, commands.
 *
 * The set is designed to reproduce the two cases the paper says the
 * integrated score compensates for (Sec. III.C, after Eq. 2):
 *   1. "Code-level patterns are reused or obfuscated between malware families"
 *        - SPINDLE reuses MOTH's loader kit  -> high SCA, low SAA (different family)
 *        - obviousmalware_v4 was refactored/rebuilt     -> lower SCA, high SAA (same family)
 *   2. "Behavioral traits cross-cut variants and require structural validation"
 *        - SLATECRYPT behaves like INKLOCK    -> high SAA, low SCA (different family)
 *
 * Run `node tools/verify.js` to print every score and check the expected outcome.
 */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- code ----

  // A shared "loader kit": packer/loader code bought or copied by several
  // authors. Shared library-style code is the classic source of code overlap
  // between unrelated families.
  const LOADER_KIT = [
    "lk_entry", "lk_api_resolve", "lk_hash_ror13", "lk_peb_walk",
    "lk_unpack_lznt1", "lk_xor_strings", "lk_anti_dbg_peb", "lk_anti_dbg_timing",
    "lk_anti_vm_cpuid", "lk_sleep_jitter", "lk_heap_alloc", "lk_heap_free",
    "lk_memcpy", "lk_memset", "lk_strlen", "lk_wcslen",
    "lk_utf8_to_wide", "lk_reloc_fix", "lk_iat_build", "lk_tls_callback",
    "lk_seh_handler", "lk_crc32", "lk_rc4_init", "lk_rc4_crypt",
    "lk_b64_decode", "lk_b64_encode", "lk_rand_seed", "lk_rand_next",
    "lk_cfg_locate", "lk_self_delete",
  ];

  // Version 2 of the kit (used by the refactored obviousmalware_v4): twelve routines changed.
  const LOADER_KIT_V2_CHANGED = {
    lk_hash_ror13: "lk_hash_fnv1a_v2",
    lk_peb_walk: "lk_peb_walk_v2",
    lk_heap_alloc: "lk_pool_alloc_v2",
    lk_heap_free: "lk_pool_free_v2",
    lk_memcpy: "lk_memcpy_v2",
    lk_memset: "lk_memset_v2",
    lk_api_resolve: "lk_api_resolve_v2",
    lk_unpack_lznt1: "lk_unpack_aplib_v2",
    lk_anti_vm_cpuid: "lk_anti_vm_cpuid_v2",
    lk_sleep_jitter: "lk_sleep_jitter_v2",
    lk_cfg_locate: "lk_cfg_locate_v2",
    lk_self_delete: "lk_self_delete_v2",
  };
  const LOADER_KIT_V2 = LOADER_KIT.map((f) => LOADER_KIT_V2_CHANGED[f] || f);

  const MOTH_CORE = [
    "moth_cfg_parse", "moth_c2_beacon", "moth_task_dispatch", "moth_cmd_shell",
    "moth_cmd_upload", "moth_cmd_download", "moth_persist_runkey", "moth_sysinfo",
  ];

  const swap = (list, from, to) => list.map((x) => (x === from ? to : x));
  const without = (list, ...drop) => list.filter((x) => !drop.includes(x));

  const MOTH_V1_CODE = [...LOADER_KIT, ...MOTH_CORE];
  const MOTH_V2_CODE = [
    ...LOADER_KIT,
    ...swap(MOTH_CORE, "moth_cmd_upload", "moth_cmd_upload_chunked"),
    "moth_screenshot",
  ];
  const MOTH_V3_CODE = [
    ...LOADER_KIT,
    ...swap(swap(MOTH_CORE, "moth_cmd_upload", "moth_cmd_upload_chunked"),
      "moth_c2_beacon", "moth_c2_beacon_https"),
    "moth_screenshot", "moth_keylog",
  ];
  // v4: rebuilt with loader kit v2 and refactored: 5 of 8 core routines kept,
  // networking and file transfer rewritten.
  const MOTH_V4_CODE = [
    ...LOADER_KIT_V2,
    ...without(MOTH_CORE, "moth_c2_beacon", "moth_cmd_upload", "moth_cmd_download"),
    "moth4_c2_client", "moth4_file_xfer", "moth4_cmd_router", "moth4_logger",
  ];

  const SPINDLE_CODE = [
    ...LOADER_KIT,
    "spd_check_locale", "spd_fetch_payload", "spd_exec_payload",
  ];

  // Public-domain AES used by two unrelated ransomware authors.
  const TINY_AES = ["tinyaes_key_expand", "tinyaes_ctr_xcrypt"];

  const INKLOCK_A_CODE = [
    "ink_main", "ink_enum_drives", "ink_walk_dir", "ink_ext_filter",
    "ink_key_gen", "ink_key_wrap_rsa", "ink_encrypt_file", "ink_rename_ext",
    "ink_drop_note", "ink_set_wallpaper", "ink_del_shadows", "ink_disable_recovery",
    "ink_kill_procs", "ink_kill_services", "ink_mutex", "ink_thread_pool",
    "ink_log", "ink_selfdestruct", "ink_cfg_decode", "ink_rand",
    ...TINY_AES,
  ];
  const INKLOCK_B_CODE = [
    ...without(
      swap(swap(INKLOCK_A_CODE, "ink_ext_filter", "ink_ext_filter_v2"),
        "ink_kill_procs", "ink_kill_procs_v2"),
      "ink_log"),
    "ink_lateral_smb",
  ];

  const SLATECRYPT_CODE = [
    "slt_start", "slt_scan_volumes", "slt_queue_files", "slt_worker",
    "slt_keypair", "slt_seal_key", "slt_crypt_chunk", "slt_mark_file",
    "slt_ransom_html", "slt_shadow_purge", "slt_boot_tamper", "slt_stop_db",
    "slt_stop_backup", "slt_wallpaper", "slt_cleanup", "slt_strings",
    "slt_cfg", "slt_report",
    ...TINY_AES,
  ];

  const DRIFTMINER_CODE = [
    "drf_main", "drf_cpu_probe", "drf_gpu_probe", "drf_pool_connect",
    "drf_stratum_login", "drf_job_parse", "drf_hash_loop", "drf_share_submit",
    "drf_idle_watch", "drf_hide_window", "drf_persist_task", "drf_cfg_json",
    "drf_throttle", "drf_watchdog",
  ];

  // ------------------------------------------------------------ attributes --

  const MOTH_ATTRS = [
    "api:InternetOpenA", "api:InternetConnectA", "api:HttpOpenRequestA",
    "api:HttpSendRequestA", "api:InternetReadFile", "api:CreateMutexA",
    "api:RegSetValueExA", "api:GetComputerNameA", "api:GetUserNameA",
    "api:CreateProcessA", "api:CreatePipe",
    "net:cdn.moth-relay.example", "net:/api/v2/beacon",
    "ua:Mozilla/4.0 (compatible; MSIE 8.0; Win32)",
    "mutex:Global\\mth_7f2a",
    "reg:HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WinSvcHost",
    "file:%APPDATA%\\WinSvc\\svchost.exe",
    "cmd:cmd.exe /c whoami && ipconfig /all",
  ];

  const SPINDLE_ATTRS = [
    "api:URLDownloadToFileA", "api:ShellExecuteA", "api:InternetOpenA",
    "api:GetComputerNameA", "api:CreateMutexA", "api:GetUserDefaultLCID",
    "net:dl.spindle-cache.example", "net:/pkg/update.bin",
    "mutex:Local\\spd_init", "file:%TEMP%\\upd_7731.exe", "ua:Spindle/1.1",
  ];

  // Behaviour shared by many ransomware families (generic tradecraft).
  const RANSOM_GENERIC = [
    "api:CryptAcquireContextW", "api:CryptGenKey", "api:CryptEncrypt",
    "api:CryptExportKey", "api:FindFirstFileW", "api:FindNextFileW",
    "api:MoveFileExW", "api:GetLogicalDrives", "api:SystemParametersInfoW",
    "api:OpenSCManagerW", "api:ControlService", "api:TerminateProcess",
    "api:CreateToolhelp32Snapshot",
    "cmd:vssadmin delete shadows /all /quiet",
    "cmd:bcdedit /set {default} recoveryenabled no",
    "cmd:wbadmin delete catalog -quiet",
  ];

  const INKLOCK_A_ATTRS = [
    ...RANSOM_GENERIC,
    "ext:.inklck", "note:READ_ME_INKLOCK.txt", "net:inkpay-portal.example",
  ];
  const INKLOCK_B_ATTRS = [
    ...swap(INKLOCK_A_ATTRS, "net:inkpay-portal.example", "net:inkpay-mirror.example"),
    "api:NetShareEnum", "api:WNetOpenEnumW",
  ];

  const SLATECRYPT_ATTRS = [
    ...RANSOM_GENERIC,
    "ext:.slate", "note:HOW_TO_RECOVER.html", "net:slate-support.example",
  ];

  const DRIFTMINER_ATTRS = [
    "net:stratum+tcp://pool.drift-hash.example:3333", "api:VirtualAlloc",
    "api:SetThreadAffinityMask", "api:GetSystemInfo", "api:CreateToolhelp32Snapshot",
    "api:GetLastInputInfo", "mutex:Global\\drf_cpu",
    "file:%LOCALAPPDATA%\\drift\\cfg.json", "cmd:schtasks /create /tn DriftSvc",
  ];

  // --------------------------------------------------------------- samples --

  const SAMPLES = [
    {
      name: "obviousmalware_v1.exe", family: "MOTH", kind: "Backdoor", firstSeen: "2025-03-02",
      source: "intel-feed/2025-03", code: MOTH_V1_CODE,
      attrs: MOTH_ATTRS,
      story: "Original MOTH backdoor: loader kit + 8 core routines.",
    },
    {
      name: "obviousmalware_v2.exe", family: "MOTH", kind: "Backdoor", firstSeen: "2025-04-17",
      source: "intel-feed/2025-04", code: MOTH_V2_CODE,
      attrs: [...MOTH_ATTRS, "api:BitBlt"],
      story: "Minor update: chunked upload and a screenshot command.",
    },
    {
      name: "obviousmalware_v3.exe", family: "MOTH", kind: "Backdoor", firstSeen: "2025-06-09",
      source: "honeypot/sg-02", code: MOTH_V3_CODE,
      attrs: [...MOTH_ATTRS, "api:BitBlt", "api:SetWindowsHookExA",
        "api:GetAsyncKeyState", "net:cdn2.moth-relay.example"],
      story: "Adds HTTPS beaconing, keylogging and a backup C2.",
    },
    {
      name: "obviousmalware_v4.exe", family: "MOTH", kind: "Backdoor", firstSeen: "2025-09-21",
      source: "incident/IR-0442", code: MOTH_V4_CODE,
      attrs: [...MOTH_ATTRS, "api:WinHttpOpen"],
      story: "Refactored and rebuilt with loader kit v2. Half the code changed, but same C2, mutex and run key.",
    },
    {
      name: "totallysafe.exe", family: "SPINDLE", kind: "Downloader", firstSeen: "2025-05-30",
      source: "sandbox/upload", code: SPINDLE_CODE,
      attrs: SPINDLE_ATTRS,
      story: "Different family, built with the same loader kit as MOTH.",
    },
    {
      name: "payme_v1.exe", family: "INKLOCK", kind: "Ransomware", firstSeen: "2025-02-11",
      source: "intel-feed/2025-02", code: INKLOCK_A_CODE,
      attrs: INKLOCK_A_ATTRS,
      story: "INKLOCK ransomware, first build.",
    },
    {
      name: "payme_v2.exe", family: "INKLOCK", kind: "Ransomware", firstSeen: "2025-07-03",
      source: "incident/IR-0391", code: INKLOCK_B_CODE,
      attrs: INKLOCK_B_ATTRS,
      story: "INKLOCK update: SMB spreading and a new payment mirror.",
    },
    {
      name: "oopslocked.exe", family: "SLATECRYPT", kind: "Ransomware", firstSeen: "2025-08-14",
      source: "honeypot/sg-01", code: SLATECRYPT_CODE,
      attrs: SLATECRYPT_ATTRS,
      story: "Unrelated ransomware written from scratch. Uses the same generic ransomware tradecraft as INKLOCK.",
    },
    {
      name: "freecrypto.exe", family: "DRIFTMINER", kind: "Coin miner", firstSeen: "2025-01-26",
      source: "sandbox/upload", code: DRIFTMINER_CODE,
      attrs: DRIFTMINER_ATTRS,
      story: "Coin miner unrelated to the other families; its generated variants share this lineage.",
    },
  ];

  // Reproducible 75-sample cohort. Preserve the nine teaching specimens exactly.
  const TEACHING_SAMPLES = SAMPLES.slice();
  const cohorts = [
    { family:"MOTH", total:30, stem:"obviousmalware" },
    { family:"SPINDLE", total:12, stem:"totallysafe" },
    { family:"INKLOCK", total:16, stem:"payme" },
    { family:"SLATECRYPT", total:10, stem:"oopslocked" },
    { family:"DRIFTMINER", total:7, stem:"freecrypto" }
  ];
  for (const cohort of cohorts) {
    const seeds = TEACHING_SAMPLES.filter(sample=>sample.family===cohort.family);
    for (let version=seeds.length+1;version<=cohort.total;version++) {
      const base=seeds[(version-seeds.length-1)%seeds.length];
      const code=base.code.slice(),attrs=base.attrs.slice();
      // Change two positions and add a distinct build feature; never clone a set.
      for(let change=0;change<2;change++) {
        const slot=(version*7+change*11)%code.length;
        code[slot]=`${code[slot]}_variant_${version}`;
      }
      code.push(`${cohort.family.toLowerCase()}_build_${version}`);
      attrs[(version*3)%attrs.length]+=`_variant_${version}`;
      attrs.push(`file:synthetic_${cohort.stem}_${version}.dat`);
      SAMPLES.push({name:`${cohort.stem}_v${version}.exe`,family:cohort.family,kind:base.kind,
        firstSeen:`2025-${String(1+(version%12)).padStart(2,"0")}-${String(1+(version%28)).padStart(2,"0")}`,
        source:"simulated/cohort-v1",code,attrs,synthetic:true,
        generation:{base:base.name,version},
        story:`Synthetic ${cohort.family} variant ${version}: two code features rewritten, one added, one attribute changed and one added.`});
    }
  }

  // Keep family variants adjacent so matrix blocks can be read directly.
  const familyOrder=new Map(cohorts.map((cohort,i)=>[cohort.family,i]));
  SAMPLES.sort((a,b)=>familyOrder.get(a.family)-familyOrder.get(b.family));

  // The pairs the walkthrough keeps coming back to.
  const KEY_PAIRS = [
    { a: "obviousmalware_v1.exe", b: "obviousmalware_v2.exe", label: "Same family", note: "Both methods agree: related." },
    { a: "obviousmalware_v1.exe", b: "obviousmalware_v4.exe", label: "Refactored variant", note: "Code was reworked, behaviour was not. SCA alone misses it." },
    { a: "obviousmalware_v1.exe", b: "totallysafe.exe", label: "Reused code", note: "Different family sharing a loader kit. SCA alone links it." },
    { a: "payme_v1.exe", b: "oopslocked.exe", label: "Look-alike behaviour", note: "Different family with generic ransomware behaviour. SAA alone links it." },
  ];

  // Table 9 of the paper, as reported (EMBER 2018 + CIC-MalMem 2022, Intel i7, 8 GB RAM).
  const PAPER_TABLE9 = [
    { method: "SCA + SAA (proposed)", runtime: 3.1, memory: 280, scaling: "Linear" },
    { method: "Opcode freq. + RF", runtime: 4.6, memory: 450, scaling: "Linear" },
    { method: "MalConv (CNN)", runtime: 5.8, memory: 1200, scaling: "Sub-linear (GPU)" },
  ];

  // Table 1 of the paper, as reported (Malimg + EMBER).
  const PAPER_TABLE1 = [
    { theta: 0.5, acc: 0.81, f1: 0.79, tpr: 0.83, fpr: 0.19, sil: 0.42 },
    { theta: 0.6, acc: 0.85, f1: 0.83, tpr: 0.86, fpr: 0.14, sil: 0.55 },
    { theta: 0.7, acc: 0.89, f1: 0.87, tpr: 0.91, fpr: 0.09, sil: 0.68 },
    { theta: 0.8, acc: 0.88, f1: 0.85, tpr: 0.88, fpr: 0.07, sil: 0.71 },
    { theta: 0.9, acc: 0.82, f1: 0.78, tpr: 0.76, fpr: 0.11, sil: 0.64 },
  ];

  const DATA = { SAMPLES, TEACHING_SAMPLES, KEY_PAIRS, PAPER_TABLE9, PAPER_TABLE1 };
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.DemoData = DATA;
})(typeof window !== "undefined" ? window : globalThis);
