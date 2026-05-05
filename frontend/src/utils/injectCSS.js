const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --teal:    #2ec4b6;
  --teal-d:  #1a8a85;
  --teal-dd: #0a5c59;
  --teal-l:  #a8e6e3;
  --teal-ll: #d6f5f3;
  --teal-bg: #e6f8f7;
  --yellow:  #ffdd57;
  --orange:  #f4845f;
  --white:   #ffffff;
  --ink:     #0d2b2a;
  --ink2:    #2a5552;
  --ink3:    #6b9997;
  --violet:  #6c63ff;
  --violet-d:#4b44cc;
  --r:  22px;
  --r2: 14px;
}

html, body, #root { height: 100%; }
body {
  font-family: 'Nunito', system-ui, sans-serif;
  background: var(--teal-bg);
  background-image: radial-gradient(circle, rgba(46,196,182,.22) 1.2px, transparent 1.2px);
  background-size: 26px 26px;
  color: var(--ink);
  min-height: 100vh;
}

/* AUTH */
.auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem 1rem; }
.auth-shell { width:100%; max-width:900px; min-height:520px; border-radius:28px; overflow:hidden; display:flex; box-shadow:0 24px 80px rgba(10,92,89,.22); }
.auth-left { flex:1; padding:3.5rem 3rem; display:flex; flex-direction:column; justify-content:center; background:var(--white); }
.auth-brand { display:flex; align-items:center; gap:10px; margin-bottom:2.5rem; }
.brand-stack { position:relative; width:46px; height:34px; flex-shrink:0; }
.bc { position:absolute; width:32px; height:24px; border-radius:7px; border:2.5px solid var(--teal-d); }
.bc1 { background:var(--teal-ll); left:14px; top:10px; transform:rotate(10deg); }
.bc2 { background:var(--teal-l);  left:7px;  top:5px;  transform:rotate(4deg); }
.bc3 { background:var(--white);   left:0;    top:0; }
.brand-name { font-size:1.5rem; font-weight:900; color:var(--teal-dd); letter-spacing:-.03em; }
.auth-heading { font-size:2rem; font-weight:900; color:var(--ink); letter-spacing:-.03em; margin-bottom:.4rem; }
.auth-sub { font-size:.9rem; color:var(--ink3); margin-bottom:2rem; font-weight:600; }
.auth-err { background:#fff1f2; border:1.5px solid #fca5a5; color:#b91c1c; border-radius:var(--r2); padding:.65rem 1rem; font-size:.85rem; font-weight:700; margin-bottom:1.25rem; }
.auth-form { display:flex; flex-direction:column; gap:.9rem; }
.field-wrap { display:flex; align-items:center; gap:10px; background:var(--teal-ll); border:2px solid var(--teal-l); border-radius:50px; padding:0 1.1rem; transition:border-color .2s; }
.field-wrap:focus-within { border-color:var(--teal); }
.field-icon { color:var(--teal-d); font-size:1rem; flex-shrink:0; line-height:1; }
.field-wrap input { flex:1; border:none; background:transparent; padding:.85rem 0; font:inherit; font-size:.95rem; color:var(--ink); outline:none; width:100%; }
.field-wrap input::placeholder { color:var(--ink3); }
.btn-submit { margin-top:.5rem; padding:.95rem; background:var(--violet); color:white; border:none; border-radius:50px; font:inherit; font-size:.95rem; font-weight:800; cursor:pointer; width:100%; transition:background .15s, transform .1s; }
.btn-submit:hover  { background:var(--violet-d); }
.btn-submit:active { transform:scale(.98); }
.auth-switch { text-align:center; font-size:.875rem; font-weight:600; color:var(--ink3); margin-top:1.25rem; }
.auth-switch button { background:none; border:none; color:var(--violet); font:inherit; font-weight:800; cursor:pointer; text-decoration:underline; }
.auth-right { width:46%; background:linear-gradient(135deg,var(--violet) 0%,#8b7cf8 100%); display:flex; align-items:center; justify-content:center; padding:2.5rem; position:relative; overflow:hidden; }
.auth-right::before { content:''; position:absolute; width:320px; height:320px; border-radius:50%; background:rgba(255,255,255,.06); top:-80px; right:-80px; }
.auth-right::after  { content:''; position:absolute; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.05); bottom:-60px; left:-40px; }
.auth-right-inner { position:relative; z-index:1; text-align:center; }
.auth-right h2 { color:white; font-size:1.6rem; font-weight:900; margin-bottom:.75rem; letter-spacing:-.02em; }
.auth-right p  { color:rgba(255,255,255,.8); font-size:.9rem; font-weight:600; line-height:1.6; margin-bottom:2rem; }
.rcp-stack { position:relative; width:190px; height:130px; margin:0 auto; }
.rcp { position:absolute; width:155px; height:105px; border-radius:18px; border:2.5px solid rgba(255,255,255,.5); display:flex; align-items:center; justify-content:center; }
.rcp1 { background:rgba(255,255,255,.08); left:35px; top:25px; transform:rotate(12deg); }
.rcp2 { background:rgba(255,255,255,.14); left:18px; top:13px; transform:rotate(5deg); }
.rcp3 { background:rgba(255,255,255,.22); left:0; top:0; }
.rcp3-txt { background:white; border-radius:10px; padding:7px 13px; font-size:.72rem; font-weight:900; color:var(--violet); }
.rdots { display:flex; gap:6px; justify-content:center; margin-top:1.75rem; }
.rdot { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.4); }
.rdot.on { background:white; width:22px; border-radius:4px; }

/* APP SHELL */
.app-shell { display:flex; flex-direction:column; min-height:100vh; }
.topbar { background:var(--white); border-bottom:2.5px solid var(--teal-l); display:flex; align-items:center; justify-content:space-between; padding:.75rem 1.75rem; position:sticky; top:0; z-index:100; box-shadow:0 2px 16px rgba(10,92,89,.08); gap:1rem; }
.tb-left { display:flex; align-items:center; gap:10px; }
.tb-bs { position:relative; width:34px; height:26px; flex-shrink:0; }
.tb-bc { position:absolute; width:22px; height:16px; border-radius:5px; border:2px solid var(--teal-d); }
.tb-bc1 { background:var(--teal-ll); left:12px; top:10px; transform:rotate(10deg); }
.tb-bc2 { background:var(--teal-l);  left:6px;  top:5px;  transform:rotate(4deg); }
.tb-bc3 { background:var(--white);   left:0;    top:0; }
.tb-name { font-size:1.1rem; font-weight:900; color:var(--teal-dd); letter-spacing:-.02em; }
.tb-nav { display:flex; gap:4px; }
.nav-btn { padding:7px 18px; border:2px solid transparent; border-radius:50px; background:none; font:inherit; font-size:.88rem; font-weight:800; color:var(--ink3); cursor:pointer; transition:all .15s; }
.nav-btn:hover { background:var(--teal-ll); color:var(--teal-dd); }
.nav-btn.on    { background:var(--teal-d);  color:white; }
.tb-right { display:flex; align-items:center; gap:8px; position:relative; }
.avatar-btn { width:38px; height:38px; border-radius:50%; background:var(--teal-d); color:white; display:flex; align-items:center; justify-content:center; font-size:.9rem; font-weight:900; border:none; cursor:pointer; transition:box-shadow .15s, transform .15s; flex-shrink:0; }
.avatar-btn:hover { box-shadow:0 0 0 3px var(--teal-l); transform:scale(1.06); }
.uname { font-size:.85rem; font-weight:700; color:var(--ink2); }

/* DROPDOWN */
.acct-dropdown { position:absolute; top:calc(100% + 12px); right:-8px; background:var(--white); border:1.5px solid #e0f0ef; border-radius:20px; width:280px; box-shadow:0 4px 6px rgba(0,0,0,.04),0 16px 48px rgba(10,92,89,.16); z-index:200; overflow:hidden; animation:dropIn .2s cubic-bezier(.34,1.56,.64,1); transform-origin:top right; }
.acct-dropdown::before { content:''; position:absolute; top:-7px; right:20px; width:14px; height:14px; background:var(--white); border-left:1.5px solid #e0f0ef; border-top:1.5px solid #e0f0ef; transform:rotate(45deg); border-radius:3px 0 0 0; }
@keyframes dropIn { from{opacity:0;transform:scale(.92) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
.dd-user { display:flex; align-items:center; gap:12px; padding:1.1rem 1.1rem .9rem; background:var(--teal-ll); border-bottom:1.5px solid #d6f5f3; }
.dd-user-avatar { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,var(--teal) 0%,var(--teal-d) 100%); color:white; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:900; flex-shrink:0; box-shadow:0 2px 8px rgba(10,92,89,.2); }
.dd-user-info { min-width:0; }
.dd-user-name  { font-size:.9rem; font-weight:900; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dd-user-email { font-size:.72rem; color:var(--ink3); font-weight:600; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dd-menu { padding:.4rem; }
.dd-btn { width:100%; padding:.7rem .85rem; border:none; border-radius:12px; background:none; font:inherit; font-size:.875rem; font-weight:700; color:var(--ink2); cursor:pointer; display:flex; align-items:center; gap:10px; text-align:left; transition:background .12s, color .12s; }
.dd-btn:hover { background:var(--teal-ll); color:var(--teal-dd); }
.dd-btn.red { color:#dc2626; }
.dd-btn.red:hover { background:#fff1f2; color:#b91c1c; }
.dd-ico { font-size:1rem; width:22px; text-align:center; flex-shrink:0; }
.dd-divider { height:1px; background:#e8f8f7; margin:.3rem .85rem; }

/* MODALS */
.modal-overlay { position:fixed; inset:0; background:rgba(10,50,48,.45); display:flex; align-items:center; justify-content:center; z-index:300; padding:1rem; animation:fadeIn .18s ease; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.modal { background:var(--white); border-radius:24px; border:2.5px solid var(--teal-l); width:100%; max-width:480px; max-height:88vh; overflow-y:auto; box-shadow:0 24px 80px rgba(10,92,89,.22); animation:slideUp2 .2s ease; }
@keyframes slideUp2 { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
.modal-head { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem 1rem; border-bottom:2px solid var(--teal-ll); position:sticky; top:0; background:var(--white); z-index:1; border-radius:24px 24px 0 0; }
.modal-title { font-size:1.1rem; font-weight:900; color:var(--teal-dd); }
.modal-close { background:none; border:none; font-size:1.3rem; cursor:pointer; color:var(--ink3); line-height:1; padding:4px; border-radius:8px; }
.modal-close:hover { background:var(--teal-ll); }
.modal-body { padding:1.25rem 1.5rem 1.5rem; }
.prof-avatar { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,var(--teal) 0%,var(--teal-d) 100%); color:white; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:900; margin:0 auto 1rem; box-shadow:0 4px 20px rgba(10,92,89,.2); }
.prof-name  { text-align:center; font-size:1.3rem; font-weight:900; color:var(--ink); }
.prof-email { text-align:center; font-size:.85rem; color:var(--ink3); font-weight:600; margin-top:4px; margin-bottom:1.5rem; }
.prof-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:1.5rem; }
.pstat { background:var(--teal-ll); border-radius:14px; padding:.85rem .5rem; text-align:center; }
.pstat-val { font-size:1.5rem; font-weight:900; color:var(--teal-dd); line-height:1; }
.pstat-lbl { font-size:.68rem; font-weight:700; color:var(--ink3); margin-top:4px; text-transform:uppercase; letter-spacing:.05em; }
.hist-empty { text-align:center; padding:2.5rem 1rem; color:var(--ink3); font-size:.9rem; font-weight:600; }
.hist-best { background:linear-gradient(135deg,var(--teal-d),var(--teal-dd)); border-radius:16px; padding:1rem 1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:14px; }
.hist-best-ico { font-size:2rem; }
.hist-best-label { font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.7); }
.hist-best-val { font-size:1.6rem; font-weight:900; color:white; line-height:1.2; }
.hist-best-sub { font-size:.75rem; color:rgba(255,255,255,.65); font-weight:600; }
.sess-list { display:flex; flex-direction:column; gap:8px; }
.sess-item { background:var(--teal-ll); border-radius:14px; padding:.85rem 1rem; display:flex; align-items:center; gap:12px; }
.sess-bar-wrap { flex:1; }
.sess-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
.sess-date { font-size:.72rem; color:var(--ink3); font-weight:700; }
.sess-pct-lbl { font-size:.82rem; font-weight:900; color:var(--teal-dd); }
.sess-track { height:6px; background:rgba(255,255,255,.6); border-radius:3px; overflow:hidden; }
.sess-fill { height:100%; border-radius:3px; transition:width .4s ease; }
.sess-meta { font-size:.7rem; color:var(--ink3); font-weight:600; margin-top:4px; }
.sess-medal { font-size:1.2rem; width:24px; text-align:center; flex-shrink:0; }

/* LAYOUT */
.content { flex:1; padding:1.75rem; max-width:920px; margin:0 auto; width:100%; }
.tab-pane { display:flex; flex-direction:column; gap:1.25rem; }
.center-pane { align-items:center; justify-content:center; min-height:70vh; }

/* PANELS */
.panel { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:1.5rem; box-shadow:0 4px 20px rgba(10,92,89,.07); }
.panel-head { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; }
.panel-title { font-size:1rem; font-weight:900; color:var(--teal-dd); display:flex; align-items:center; gap:8px; }
.step { width:26px; height:26px; border-radius:50%; background:var(--teal-d); color:white; display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:900; flex-shrink:0; }
.pill { padding:2px 9px; border-radius:50px; background:var(--teal-ll); color:var(--teal-d); font-size:.72rem; font-weight:800; }
.notes-area { width:100%; padding:12px 14px; border:2px solid var(--teal-l); border-radius:var(--r2); font:inherit; font-size:.9rem; color:var(--ink); background:var(--white); resize:vertical; outline:none; transition:border-color .2s; margin-top:.75rem; margin-bottom:.75rem; }
.notes-area:focus { border-color:var(--teal); }
.row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.btn { padding:9px 20px; border:none; border-radius:50px; font:inherit; font-size:.88rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background .15s, transform .1s; }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn:active:not(:disabled) { transform:scale(.97); }
.btn-teal  { background:var(--teal-d); color:white; }
.btn-teal:hover:not(:disabled)  { background:var(--teal-dd); }
.btn-ghost { background:var(--teal-ll); color:var(--teal-d); border:2px solid var(--teal-l); }
.btn-ghost:hover:not(:disabled) { background:var(--teal-l); }
.btn.lg { padding:13px 32px; font-size:1rem; }
.msg-err { margin-top:.75rem; padding:.65rem 1rem; background:#fff1f2; border:1.5px solid #fca5a5; color:#b91c1c; border-radius:var(--r2); font-size:.85rem; font-weight:700; }
.msg-ok  { margin-top:.75rem; padding:.65rem 1rem; background:#f0fdf4; border:1.5px solid #86efac; color:#166534; border-radius:var(--r2); font-size:.85rem; font-weight:700; }
.spin { width:14px; height:14px; border:2.5px solid rgba(255,255,255,.35); border-top-color:white; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
@keyframes spin { to { transform:rotate(360deg); } }
.pgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px; margin-top:.75rem; }
.pcard { background:var(--teal-ll); border:2px solid var(--teal-l); border-radius:var(--r2); padding:.85rem; display:flex; gap:9px; align-items:flex-start; }
.pnum { flex-shrink:0; width:20px; height:20px; border-radius:50%; background:var(--teal-d); color:white; display:flex; align-items:center; justify-content:center; font-size:.65rem; font-weight:900; }
.pq { font-size:.82rem; font-weight:700; color:var(--ink); margin-bottom:3px; line-height:1.4; }
.pa { font-size:.78rem; color:var(--ink2); line-height:1.4; }
.search-inp { width:100%; margin-top:.75rem; padding:9px 16px; border:2px solid var(--teal-l); border-radius:50px; font:inherit; font-size:.88rem; background:var(--white); color:var(--ink); outline:none; transition:border-color .2s; }
.search-inp:focus { border-color:var(--teal); }

/* FLASHCARD */
.teal-card { background:var(--teal); border-radius:var(--r); border:3.5px solid var(--teal-d); position:relative; overflow:hidden; }
.doodle { position:absolute; inset:0; pointer-events:none; }
.doodle svg { position:absolute; inset:0; width:100%; height:100%; }
.inner-box { background:var(--white); border-radius:16px; border:2.5px solid rgba(255,255,255,.7); padding:1.25rem 1.5rem; text-align:center; position:relative; z-index:1; max-width:88%; box-shadow:0 4px 20px rgba(0,0,0,.13); }
.inner-box::after { content:''; display:block; margin-top:.7rem; height:10px; background:radial-gradient(circle,var(--yellow) 4px,transparent 4px) 0 0/14px 10px, radial-gradient(circle,var(--orange) 4px,transparent 4px) 14px 0/14px 10px, radial-gradient(circle,var(--teal-l) 4px,transparent 4px) 28px 0/14px 10px; background-repeat:no-repeat; opacity:.85; }
.clbl { display:block; font-size:.65rem; font-weight:900; text-transform:uppercase; letter-spacing:.12em; color:var(--teal-d); margin-bottom:.45rem; }
.ctxt { font-size:1.15rem; font-weight:800; color:var(--ink); line-height:1.45; }

/* STUDY */
.smeta { display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; }
.sctr  { font-size:.9rem; font-weight:800; color:var(--teal-dd); }
.scores { display:flex; gap:7px; }
.spill { padding:3px 12px; border-radius:50px; font-size:.78rem; font-weight:800; }
.spill.r { background:#dcfce7; color:#166534; }
.spill.w { background:#fee2e2; color:#991b1b; }
.prog  { width:100%; height:6px; background:var(--teal-ll); border-radius:3px; overflow:hidden; margin-bottom:1.5rem; }
.progf { height:100%; background:var(--teal-d); border-radius:3px; transition:width .35s ease; }
.stage { perspective:1200px; width:100%; max-width:520px; height:285px; margin:0 auto 1.5rem; cursor:pointer; transition:transform .42s cubic-bezier(.34,1.56,.64,1), opacity .42s; }
.stage.sr { transform:translateX(130%) rotate(18deg); opacity:0; pointer-events:none; }
.stage.sl { transform:translateX(-130%) rotate(-18deg); opacity:0; pointer-events:none; }
.fcard { width:100%; height:100%; position:relative; transform-style:preserve-3d; transition:transform .52s cubic-bezier(.4,0,.2,1); }
.fcard.flipped { transform:rotateY(180deg); }
.face { position:absolute; inset:0; backface-visibility:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.25rem; }
.face.back { transform:rotateY(180deg); background:var(--teal-d) !important; border-color:var(--teal-dd) !important; }
.taphint { position:absolute; bottom:13px; font-size:.72rem; font-weight:700; color:rgba(255,255,255,.72); }
.sacts { display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap; max-width:520px; margin:0 auto; }
.sbtn { flex:1; max-width:148px; padding:11px 10px; border-radius:50px; border:2.5px solid; font:inherit; font-size:.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:transform .15s, opacity .15s; }
.sbtn:disabled { opacity:.38; cursor:not-allowed; }
.sbtn:not(:disabled):hover { transform:translateY(-2px); }
.sbtn.w { background:#fff1f2; border-color:#fca5a5; color:#991b1b; }
.sbtn.r { background:#f0fdf4; border-color:#86efac; color:#166534; }
.fmid { padding:10px 18px; background:var(--teal-d); color:white; border:none; border-radius:50px; font:inherit; font-size:.85rem; font-weight:800; cursor:pointer; transition:background .15s; }
.fmid:hover { background:var(--teal-dd); }
.kbhint { text-align:center; font-size:.72rem; color:var(--ink3); margin-top:.6rem; }
.sstart { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:3rem 2.5rem; text-align:center; max-width:420px; box-shadow:0 8px 40px rgba(10,92,89,.14); }
.sdeck { position:relative; width:110px; height:80px; margin:0 auto 1.75rem; }
.sdc { position:absolute; width:80px; height:56px; border-radius:12px; border:2.5px solid var(--teal-d); }
.sdc2 { background:var(--teal-ll); left:30px; top:24px; transform:rotate(12deg); }
.sdc1 { background:var(--teal-l);  left:15px; top:12px; transform:rotate(5deg); }
.sdc0 { background:var(--teal);    left:0; top:0; }
.stitle { font-size:1.5rem; font-weight:900; color:var(--teal-dd); margin-bottom:.45rem; }
.ssub   { font-size:.88rem; color:var(--ink3); font-weight:600; margin-bottom:1.75rem; }
.shint  { font-size:.72rem; color:var(--ink3); margin-top:.9rem; }
.rcard  { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:2.5rem 2rem; text-align:center; max-width:420px; box-shadow:0 8px 40px rgba(10,92,89,.14); }
.rpct   { font-size:4rem; font-weight:900; line-height:1; margin-bottom:.45rem; }
.rmsg   { font-size:.95rem; color:var(--ink2); font-weight:600; margin-bottom:1.75rem; }
.rbreak { display:flex; gap:10px; justify-content:center; margin-bottom:1.75rem; }
.rbi    { display:flex; flex-direction:column; align-items:center; padding:.7rem 1.1rem; border-radius:var(--r2); min-width:76px; }
.rbi.r  { background:#f0fdf4; } .rbi.w { background:#fff1f2; } .rbi.t { background:var(--teal-ll); }
.rval   { font-size:1.7rem; font-weight:900; }
.rbi.r .rval { color:#166534; } .rbi.w .rval { color:#991b1b; } .rbi.t .rval { color:var(--teal-d); }
.rlbl   { font-size:.7rem; font-weight:700; color:var(--ink3); margin-top:2px; }

/* SAVED */
.sgrid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.scard  { min-height:145px; cursor:pointer; transition:transform .15s, box-shadow .15s; display:flex; flex-direction:column; position:relative; }
.scard:hover { transform:translateY(-3px); }
.scard.selected { box-shadow:0 0 0 3.5px white, 0 0 0 6px var(--violet); transform:translateY(-3px); }
.scard-in { position:relative; z-index:1; padding:.95rem; display:flex; flex-direction:column; justify-content:space-between; height:100%; flex:1; }
.sq { font-size:.82rem; font-weight:800; color:white; line-height:1.4; margin-bottom:.35rem; }
.sa { font-size:.76rem; color:rgba(255,255,255,.82); line-height:1.4; }
.sdt { font-size:.66rem; color:rgba(255,255,255,.55); margin-top:.5rem; }
.sel-check { position:absolute; top:10px; right:10px; z-index:2; width:22px; height:22px; border-radius:50%; background:white; border:2.5px solid var(--teal-l); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:900; color:var(--violet); transition:all .15s; }
.scard.selected .sel-check { background:var(--violet); border-color:var(--violet); color:white; }
.sel-bar { position:sticky; bottom:1.5rem; z-index:50; background:var(--teal-dd); color:white; border-radius:50px; padding:.85rem 1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; box-shadow:0 8px 32px rgba(10,92,89,.35); animation:slideUp .25s ease; }
@keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
.sel-bar-left { display:flex; align-items:center; gap:10px; }
.sel-count { font-size:.95rem; font-weight:900; }
.sel-hint  { font-size:.78rem; color:rgba(255,255,255,.65); font-weight:600; }
.sel-actions { display:flex; gap:8px; }
.btn-violet { background:var(--violet); color:white; border:none; }
.btn-violet:hover:not(:disabled) { background:var(--violet-d); }
.btn-white  { background:white; color:var(--teal-dd); border:none; }
.btn-white:hover:not(:disabled)  { background:var(--teal-ll); }
.empty { text-align:center; padding:4rem 1rem; color:var(--ink3); }
.empty-ico { font-size:3rem; margin-bottom:1rem; }
.empty p { font-size:.9rem; font-weight:600; }

/* QUIZ */
.quiz-start-card { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:2.5rem 2rem; text-align:center; max-width:460px; box-shadow:0 8px 40px rgba(10,92,89,.14); }
.quiz-start-card h2 { font-size:1.4rem; font-weight:900; color:var(--teal-dd); margin-bottom:.4rem; }
.quiz-start-card p  { font-size:.88rem; color:var(--ink3); font-weight:600; margin-bottom:1.5rem; }
.quiz-count-row { display:flex; align-items:center; gap:10px; justify-content:center; margin-bottom:1.5rem; flex-wrap:wrap; }
.quiz-count-row label { font-size:.85rem; font-weight:700; color:var(--ink2); }
.quiz-count-select { padding:7px 14px; border:2px solid var(--teal-l); border-radius:50px; font:inherit; font-size:.88rem; color:var(--ink); background:var(--white); outline:none; cursor:pointer; }
.quiz-card-panel { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:2rem; box-shadow:0 4px 20px rgba(10,92,89,.07); }
.quiz-q { font-size:1.15rem; font-weight:800; color:var(--ink); line-height:1.5; margin-bottom:1.5rem; }
.quiz-input-row { display:flex; gap:8px; margin-bottom:1rem; }
.quiz-ans-input { flex:1; padding:10px 16px; border:2px solid var(--teal-l); border-radius:50px; font:inherit; font-size:.92rem; color:var(--ink); outline:none; transition:border-color .2s; background:var(--white); }
.quiz-ans-input:focus { border-color:var(--teal); }
.quiz-ans-input:disabled { opacity:.6; background:var(--teal-ll); }
.feedback-box { border-radius:var(--r2); padding:1rem 1.25rem; margin-bottom:1rem; }
.feedback-box.correct { background:#f0fdf4; border:2px solid #86efac; }
.feedback-box.wrong   { background:#fff1f2; border:2px solid #fca5a5; }
.feedback-verdict { font-size:1rem; font-weight:900; margin-bottom:.35rem; }
.feedback-box.correct .feedback-verdict { color:#166534; }
.feedback-box.wrong   .feedback-verdict { color:#b91c1c; }
.feedback-ans { font-size:.88rem; font-weight:600; color:var(--ink2); }
.quiz-summary { background:var(--white); border:2.5px solid var(--teal-l); border-radius:var(--r); padding:2.5rem 2rem; text-align:center; max-width:400px; box-shadow:0 8px 40px rgba(10,92,89,.14); }
.quiz-pct { font-size:4rem; font-weight:900; line-height:1; margin-bottom:.4rem; }
.quiz-summary p { font-size:.92rem; color:var(--ink2); font-weight:600; margin-bottom:1.5rem; }

@media(max-width:700px){
  .auth-right { display:none; }
  .auth-left  { padding:2.5rem 1.75rem; }
  .auth-heading { font-size:1.6rem; }
  .tb-name, .uname { display:none; }
  .content { padding:1rem; }
  .stage { height:240px; }
  .ctxt { font-size:1rem; }
  .quiz-input-row { flex-direction:column; }
}
`;

export function injectCSS() {
  if (document.getElementById("fc-css")) return;
  const s = document.createElement("style");
  s.id = "fc-css";
  s.textContent = CSS;
  document.head.prepend(s);
}
