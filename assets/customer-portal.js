"use strict";
/*
 * Muhaimin Dairy Customer Portal foundation.
 * This module never loads or calls the Main Admin operational data path.
 * It accesses only the authenticated user's own customer_profiles row.
 */
(function(){
  const byId = id => document.getElementById(id);
  const setStatus = message => {
    const node=byId("cpStatus");
    if(node) node.textContent=message;
  };
  function renderShell(user){
    const root=byId("customerPortal");
    if(!root) return false;
    root.innerHTML=`
      <section class="cp-card">
        <div style="font-size:30px" aria-hidden="true">🧑‍💼</div>
        <h2 style="margin:6px 0">Customer Portal</h2>
        <p class="cp-muted">আপনার নিজস্ব গ্রাহক অ্যাকাউন্ট ও প্রোফাইল। এই পোর্টাল Main Admin-এর ব্যবসায়িক ব্যবস্থাপনা থেকে আলাদা।</p>
        <p class="cp-muted">লগইন ইমেইল: <strong id="cpEmail"></strong></p>
      </section>
      <section class="cp-card">
        <h3 style="margin-top:0">👤 আমার প্রোফাইল</h3>
        <p class="cp-muted">শুধু আপনার অ্যাকাউন্টের সঙ্গে যুক্ত প্রোফাইল দেখা ও সম্পাদনা করা যাবে।</p>
        <form id="cpProfileForm">
          <label for="cpFullName">নাম</label>
          <input id="cpFullName" name="full_name" maxlength="120" autocomplete="name" required>
          <label for="cpPhone">মোবাইল নম্বর (ঐচ্ছিক)</label>
          <input id="cpPhone" name="phone" type="tel" maxlength="32" autocomplete="tel" placeholder="+8801XXXXXXXXX">
          <div class="cp-actions">
            <button class="primary" id="cpSave" type="submit" disabled>প্রোফাইল সংরক্ষণ</button>
            <button id="cpReload" type="button">আবার লোড করুন</button>
            <button id="cpLogout" type="button">লগআউট</button>
          </div>
          <p id="cpStatus" class="cp-muted" role="status" aria-live="polite">প্রোফাইল যাচাই করা হচ্ছে…</p>
        </form>
      </section>
      <section class="cp-card">
        <h3 style="margin-top:0">🧩 Customer সুবিধাসমূহ</h3>
        <p class="cp-muted">ভবিষ্যতের সব সুবিধা এখানে দৃশ্যমান থাকবে। প্রতিটি সুবিধার অবস্থা আলাদাভাবে নিয়ন্ত্রিত হবে; বর্তমানে সব ব্যবসায়িক সুবিধা বন্ধ।</p>
        <div class="cp-feature-grid" id="cpFeatureGrid" aria-label="Customer feature catalogue"></div>
      </section>`;
    byId("cpEmail").textContent=user.email||"";
    renderFeatureCatalogue();
    byId("cpProfileForm").addEventListener("submit",saveProfile);
    byId("cpReload").addEventListener("click",loadProfile);
    byId("cpLogout").addEventListener("click",async()=>{
      const button=byId("cpLogout");button.disabled=true;
      try{const result=await sb.auth.signOut();if(result.error)throw result.error;location.reload();}
      catch(error){setStatus("লগআউট করা যায়নি: "+(error.message||String(error)));button.disabled=false;}
    });
    return true;
  }
  const CUSTOMER_FEATURES = [
    ["🛍️","পণ্য ও ক্যাটালগ","পণ্য দেখা, বিবরণ, মূল্য ও প্রাপ্যতা","OFF"],
    ["🧺","অর্ডার ব্যবস্থাপনা","কার্ট, অর্ডার তৈরি, অর্ডার ইতিহাস ও স্ট্যাটাস","OFF"],
    ["🚚","ডেলিভারি ও ট্র্যাকিং","ডেলিভারি ঠিকানা, সময়, ট্র্যাকিং ও প্রাপ্তি নিশ্চিতকরণ","OFF"],
    ["🔁","নিয়মিত সরবরাহ / সাবস্ক্রিপশন","দৈনিক বা সাপ্তাহিক পুনরাবৃত্ত সরবরাহ","OFF"],
    ["💳","পেমেন্ট","অনলাইন পেমেন্ট, পেমেন্ট স্ট্যাটাস ও রসিদ","OFF"],
    ["🧾","ইনভয়েস ও হিসাব","ইনভয়েস, স্টেটমেন্ট ও লেনদেনের ইতিহাস","OFF"],
    ["↩️","রিফান্ড ও অভিযোগ","রিফান্ড অনুরোধ, অর্ডার সমস্যা ও সমাধানের অগ্রগতি","OFF"],
    ["⭐","লয়্যালটি ও পুরস্কার","পয়েন্ট, কুপন, সদস্য সুবিধা ও রিওয়ার্ড","OFF"],
    ["🔔","নোটিফিকেশন","অর্ডার, ডেলিভারি, পেমেন্ট ও গুরুত্বপূর্ণ আপডেট","OFF"],
    ["🎧","কাস্টমার সাপোর্ট","সহায়তা টিকিট, বার্তা ও অভিযোগ ট্র্যাকিং","OFF"],
    ["🥛","পণ্যের উৎস ও মান","ব্যাচ, উৎপাদন/সংগ্রহের উৎস এবং মান-সংক্রান্ত তথ্য","OFF"],
    ["📍","একাধিক শাখা / সংগ্রহ কেন্দ্র","পছন্দের শাখা, কেন্দ্র ও সেবা-এলাকা নির্বাচন","OFF"],
    ["🛡️","গোপনীয়তা ও নিরাপত্তা","সম্মতি, সেশন, অ্যাকাউন্ট নিরাপত্তা ও ডেটা অনুরোধ","OFF"],
    ["🤖","AI Smart Assistant","পণ্য-তথ্য, অর্ডার সহায়তা ও ব্যক্তিগত পরামর্শ","OFF"],
    ["🪪","পরিচয় যাচাই (KYC)","প্রয়োজন হলে আইনসম্মত পরিচয় যাচাই; মানবীয় পর্যালোচনাসহ","OFF"]
  ];
  function renderFeatureCatalogue(){
    const grid=byId("cpFeatureGrid");if(!grid)return;
    grid.innerHTML=CUSTOMER_FEATURES.map(([icon,title,description,status])=>`
      <article class="cp-feature" aria-label="${title}: ${status}">
        <div class="cp-feature-top"><span class="cp-feature-icon" aria-hidden="true">${icon}</span><span class="cp-feature-state">${status}</span></div>
        <strong>${title}</strong>
        <p>${description}</p>
        <small>বর্তমানে বন্ধ · ভবিষ্যৎ অনুমোদনসাপেক্ষ</small>
      </article>`).join("");
  }
  async function loadProfile(){
    const user=window.__muhaiminCustomerUser;
    if(!user?.id){setStatus("নিরাপদ অ্যাকাউন্ট সেশন পাওয়া যায়নি।");return;}
    const save=byId("cpSave");if(save)save.disabled=true;
    setStatus("আপনার প্রোফাইল লোড হচ্ছে…");
    try{
      const result=await sb.from("customer_profiles")
        .select("user_id,full_name,phone")
        .eq("user_id",user.id)
        .maybeSingle();
      if(result.error)throw result.error;
      byId("cpFullName").value=result.data?.full_name||"";
      byId("cpPhone").value=result.data?.phone||"";
      if(save)save.disabled=false;
      setStatus(result.data
        ?"প্রোফাইল লোড হয়েছে। পরিবর্তন করে সংরক্ষণ করতে পারবেন।"
        :"এখনো প্রোফাইল তৈরি হয়নি। নাম লিখে সংরক্ষণ করুন।");
    }catch(error){
      setStatus("Customer Profile ডেটাবেস প্রস্তুত নয় বা অনুমতি যাচাই ব্যর্থ হয়েছে। TEST 2 migration ও RLS যাচাই না হওয়া পর্যন্ত সংরক্ষণ বন্ধ। ("+(error.message||String(error))+")");
    }
  }
  async function saveProfile(event){
    event.preventDefault();
    const user=window.__muhaiminCustomerUser;
    if(!user?.id){setStatus("সেশন যাচাই করা যায়নি; সংরক্ষণ বন্ধ।");return;}
    const fullName=byId("cpFullName").value.trim();
    const phone=byId("cpPhone").value.trim();
    if(!fullName||fullName.length>120){setStatus("নাম ১–১২০ অক্ষরের মধ্যে লিখুন।");return;}
    if(phone.length>32){setStatus("মোবাইল নম্বর সর্বোচ্চ ৩২ অক্ষরের হতে পারে।");return;}
    const save=byId("cpSave");save.disabled=true;setStatus("প্রোফাইল সংরক্ষণ হচ্ছে…");
    try{
      const result=await sb.from("customer_profiles")
        .upsert({user_id:user.id,full_name:fullName,phone:phone||null},{onConflict:"user_id"})
        .select("user_id,full_name,phone")
        .single();
      if(result.error)throw result.error;
      byId("cpFullName").value=result.data.full_name||"";
      byId("cpPhone").value=result.data.phone||"";
      setStatus("প্রোফাইল TEST 2-তে সংরক্ষিত হয়েছে। পুনরায় লোড করে যাচাই করুন।");
    }catch(error){
      setStatus("সংরক্ষণ ব্যর্থ। ডেটাবেস/RLS প্রস্তুতি ও নিজের user_id যাচাই করুন। ("+(error.message||String(error))+")");
    }finally{save.disabled=false;}
  }
  window.MuhaiminCustomerPortal={
    mount:async user=>{
      window.__muhaiminCustomerUser=user;
      if(!renderShell(user))return;
      await loadProfile();
    },
    unmount:()=>{
      window.__muhaiminCustomerUser=null;
      const root=byId("customerPortal");if(root)root.classList.add("hidden");
    }
  };
})();
