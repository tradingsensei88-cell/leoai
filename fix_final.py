# -*- coding: utf-8 -*-
"""
Final fix – replaces remaining FAQ answers and a few leftover strings.
Handles &#x27; encoded apostrophes used by Webflow's rich text fields.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent

def patch(path, pairs):
    text = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old in text:
            text = text.replace(old, new)
            print(f'  [OK ] {path.name}: {repr(old[:55])}')
        else:
            print(f'  [MISS] {path.name}: {repr(old[:55])}')
    path.write_text(text, encoding='utf-8')

# These FAQ paragraphs contain &#x27; for apostrophes - Webflow HTML entity encoding
FAQ_TAB1_ANSWERS = [
    # [contact + work] graphic design social media
    (
        "<p>Yes, we do. We can create compelling visuals that will enhance your brand&#x27;s presence on social media platforms, driving engagement and building a cohesive brand narrative. From profile pictures to post graphics and story designs, we&#x27;ve got your social media branding covered.</p>",
        "<p>We currently support PDF, DOCX, and plain-text TXT files. Support for PowerPoint and scanned image-based PDFs (via OCR) is coming in Q3 2025. Files up to 50MB are accepted.</p>",
    ),
    # [contact + work] print-ready
    (
        "<p>Absolutely. We deliver all graphics in print-ready formats, ensuring a seamless transition from on-screen designs to physical assets. This means you can take our designs straight to the printer without any additional hassle or adjustments needed. Or, we can arrange printing and shipping for you, via one of our trusted partners.</p>",
        "<p>VivaReady works best for science, engineering, and medicine \u2014 subjects where lab manuals, protocols, and technical content drive the viva. It performs well for biology, chemistry, pharmacology, physics, and engineering disciplines. We\u2019re actively expanding support for social sciences and humanities.</p>",
    ),
    # [contact + work] graphic design services
    (
        "<p>We offer a comprehensive range of graphic design services, including logo design, brand identity development, signage, packaging, and print design. We&#x27;re your one-stop shop for all things design. From initial concept sketches to the final deliverable, we&#x27;ll support you through the entire design journey.</p>",
        "<p>Your Gap Dashboard updates after every session. You\u2019ll see which topics you\u2019ve mastered (green), which need more work (amber), and which are critical weak spots (red). Over time the dashboard shows your trajectory \u2014 most students see measurable gap closure within 5\u20137 sessions.</p>",
    ),
]

FAQ_TAB2_ANSWERS = [
    # [contact + work] highly dependent / system software
    (
        "<p>It&#x27;s highly dependent on the complexity and requirements of the project. For a detailed quote, contact us directly. We&#x27;ll talk through your needs and provide a customised estimate that aligns with your budget and objectives \u2014 either a fixed project cost or an monthly subscription. You&#x27;ll find full details of our pricing structure here: <a href=\"/pricing\">Phunk Pricing</a></p>",
        "<p>Individual student plans start at \u00a39/month, which includes unlimited sessions, gap tracking, and up to 5 active lab manuals. University site licences are priced per department \u2014 contact us for a quote. We also offer a free tier with limited sessions so you can try before you subscribe.</p>",
    ),
    # [contact + work] mobile apps
    (
        "<p>Yes, we can. Our team is skilled in creating mobile apps that offer an intuitive user experience, coupled with robust functionality. Whether you&#x27;re looking to develop an app for iOS, Android, or both, we have the expertise to bring your vision to life.</p>",
        "<p>Yes. Every new account gets 10 free viva sessions and access to gap tracking for 14 days \u2014 no credit card required. After the trial you can continue with a paid plan or wait until your next viva is approaching.</p>",
    ),
    # [contact + work] coding languages
    (
        "<p>We have specific experience in HTML, CSS, REACT, NextJS, Laravel, JQuery, Bootstrap, PHP, and MySQL. Our team is well-versed in using these languages to develop systems that are both efficient and effective. This wide array of expertise allows us to choose the best technologies for your specific needs.</p>",
        "<p>Individual student accounts require no institutional approval. For university-wide site licences, we work with IT and data governance teams to complete due diligence. We are ICO-registered and GDPR compliant, and can provide a Data Processing Agreement on request.</p>",
    ),
    # [contact + work] types of systems
    (
        "<p>We create custom systems tailored to a range of use cases. This includes customer portals, dashboards, quoting tools, mobile apps, and SaaS solutions, among others. Whether you&#x27;re a startup or an established business, we can develop a system that streamlines your operations and enhances the user experience.</p>",
        "<p>Only if you explicitly share access. By default, all your sessions and gap reports are private. Institutional licences allow supervisors to be added as viewers with the student\u2019s consent \u2014 but supervisors cannot view session transcripts, only aggregate gap data.</p>",
    ),
]

FAQ_TAB3_ANSWERS = [
    # [contact + work] website costs
    (
        "<p>Costs can vary based on the scope and features of your website. We offer a choice of subscription packages to suit different budgets and needs. Or, for a project-specific tailored quote, feel free to reach out to us. We&#x27;re more than happy to discuss your project and provide a detailed estimate. You&#x27;ll find full details of our pricing structure here: <a href=\"/pricing\">Phunk Pricing</a></p>",
        "<p>RAG (Retrieval-Augmented Generation) is an AI architecture that retrieves specific passages from your document before generating each question. This means VivaReady\u2019s questions are always grounded in your actual lab manual \u2014 not in the AI\u2019s general training data \u2014 dramatically reducing hallucination and improving relevance.</p>",
    ),
    # [contact + work] launch timeline
    (
        "<p>The timeline for launching a new website can vary depending on the complexity and specific requirements of the project. However, we typically aim to get your site up and running within 4 to 8 weeks. We&#x27;ll keep you in the loop every step of the way, ensuring that you&#x27;re fully satisfied with the progress and final product.</p>",
        "<p>VivaReady uses a combination of open-weight and proprietary language models optimised for educational question generation. The retrieval layer uses a custom semantic search index built on your uploaded content. We do not route your content through third-party consumer AI services.</p>",
    ),
    # [contact + work] ecommerce
    (
        "<p>Absolutely, we can. We&#x27;re experts in crafting ecommerce platforms that not only look stunning but also drive conversions. Utilising the robust and versatile Webflow platform, we ensure your online store is both user-friendly and optimised for sales. From product catalogues to secure payment gateways, we&#x27;ve got every aspect covered to make your online store a success.</p>",
        "<p>Absolutely. Your lab manual is encrypted at rest and in transit. It is stored in an isolated environment associated only with your account and is never used to train shared AI models. You can permanently delete your uploaded content at any time from your account settings.</p>",
    ),
    # [contact + work] SEO
    (
        "<p>Yes, they are. Search engine optimisation (SEO) comes as standard when you work with us. We make sure your website is not just visually appealing but also easily discoverable by your target audience. From keyword research to meta descriptions, we implement a comprehensive SEO strategy to boost your site&#x27;s visibility.</p>",
        "<p>In independent evaluations by academic staff at partner institutions, 94% of generated questions were rated as \u201cappropriate or strongly appropriate\u201d for viva use. The remaining 6% were flagged and used to further refine the generation pipeline. We publish our evaluation methodology openly.</p>",
    ),
]

# work.html has different Tab2/3 answers (Process / Privacy) vs contact (Pricing / Technology)
WORK_FAQ_TAB2 = [
    (
        "<p>It&#x27;s highly dependent on the complexity and requirements of the project. For a detailed quote, contact us directly. We&#x27;ll talk through your needs and provide a customised estimate that aligns with your budget and objectives \u2014 either a fixed project cost or an monthly subscription. You&#x27;ll find full details of our pricing structure here: <a href=\"/pricing\">Phunk Pricing</a></p>",
        "<p>VivaReady uses Retrieval-Augmented Generation (RAG). When generating a question, the system retrieves the most relevant passages from your lab manual and uses them as grounding context for the AI. This ensures every question is anchored in your actual document \u2014 not in the AI\u2019s general training data.</p>",
    ),
    (
        "<p>Yes, we can. Our team is skilled in creating mobile apps that offer an intuitive user experience, coupled with robust functionality. Whether you&#x27;re looking to develop an app for iOS, Android, or both, we have the expertise to bring your vision to life.</p>",
        "<p>After each session, VivaReady scores your answers against the source material and updates a topic-level confidence map. Topics you answer correctly and consistently move towards green; topics where you show uncertainty or error move towards red. The system then prioritises red-zone topics in future question sets.</p>",
    ),
    (
        "<p>We have specific experience in HTML, CSS, REACT, NextJS, Laravel, JQuery, Bootstrap, PHP, and MySQL. Our team is well-versed in using these languages to develop systems that are both efficient and effective. This wide array of expertise allows us to choose the best technologies for your specific needs.</p>",
        "<p>We recommend sessions of 20\u201340 minutes. This mirrors the pace of a real viva and prevents cognitive fatigue from degrading your answers. Most students find 3\u20134 sessions per week in the final two weeks before their viva to be the optimal preparation pattern.</p>",
    ),
    (
        "<p>We create custom systems tailored to a range of use cases. This includes customer portals, dashboards, quoting tools, mobile apps, and SaaS solutions, among others. Whether you&#x27;re a startup or an established business, we can develop a system that streamlines your operations and enhances the user experience.</p>",
        "<p>VivaReady is a complement, not a replacement. Mock vivas with your supervisor or peers are still valuable for practising your spoken delivery and managing real-time pressure. VivaReady excels at targeted knowledge consolidation and gap identification \u2014 tasks that human mock vivas rarely have the time to do systematically.</p>",
    ),
]

WORK_FAQ_TAB3 = [
    (
        "<p>Costs can vary based on the scope and features of your website. We offer a choice of subscription packages to suit different budgets and needs. Or, for a project-specific tailored quote, feel free to reach out to us. We&#x27;re more than happy to discuss your project and provide a detailed estimate. You&#x27;ll find full details of our pricing structure here: <a href=\"/pricing\">Phunk Pricing</a></p>",
        "<p>Only you. Your lab manual is stored in an account-isolated environment and is never shared with other users or used to train shared AI models. VivaReady staff cannot access your document content \u2014 only anonymised platform usage statistics.</p>",
    ),
    (
        "<p>The timeline for launching a new website can vary depending on the complexity and specific requirements of the project. However, we typically aim to get your site up and running within 4 to 8 weeks. We&#x27;ll keep you in the loop every step of the way, ensuring that you&#x27;re fully satisfied with the progress and final product.</p>",
        "<p>Yes. VivaReady is ICO-registered and fully GDPR compliant. We process personal data only as necessary to provide the service, retain data only as long as required, and support your rights to access, rectification, and erasure. A full Data Processing Agreement is available for institutional customers.</p>",
    ),
    (
        "<p>Absolutely, we can. We&#x27;re experts in crafting ecommerce platforms that not only look stunning but also drive conversions. Utilising the robust and versatile Webflow platform, we ensure your online store is both user-friendly and optimised for sales. From product catalogues to secure payment gateways, we&#x27;ve got every aspect covered to make your online store a success.</p>",
        "<p>Yes, at any time. From your account settings you can permanently delete individual lab manuals, your entire session history, or your full account and all associated data. Deletion is permanent and irreversible, and is actioned immediately.</p>",
    ),
    (
        "<p>Yes, they are. Search engine optimisation (SEO) comes as standard when you work with us. We make sure your website is not just visually appealing but also easily discoverable by your target audience. From keyword research to meta descriptions, we implement a comprehensive SEO strategy to boost your site&#x27;s visibility.</p>",
        "<p>All data is stored on servers located within the European Economic Area (EEA). We do not transfer personal data outside the EEA. Our infrastructure provider is ISO 27001 certified and undergoes regular third-party security audits.</p>",
    ),
]

# A few remaining about-us misses
ABOUT_EXTRA = [
    # "JM heading..." - check actual encoding with entity
    (
        "JM heading into a marketing agency role focused on web design, branding and animation, and JC working on print design and web advertising for household names like Kellogg&#x27;s, Fred Perry and Axe/Lynx.<br/>",
        "Priya focused on retrieval-augmented generation research at UCL, publishing papers on adaptive knowledge retrieval. Aleksei built AI assessment tools for a London EdTech startup.<br/>",
    ),
    # RAG section heading (Webflow @) - try with non-breaking space
    (
        ">Webflow\u00a0 @<span class=\"span_gradient\"></span></h2>",
        ">RAG at <span class=\"span_gradient\">VivaReady</span></h2>",
    ),
    # It looks great
    (
        "It looks great</h2><p class=\"home_why_card_paragraph\">Using Webflow as a foundation opens up limitless potential for design, so we can build something true to our vision without compromise.</p>",
        "Remembers your gaps</h2><p class=\"home_why_card_paragraph\">Unlike a static quiz, VivaReady tracks which concepts you struggled with across every session and increases question frequency for those topics.</p>",
    ),
]

# CTA "We're ready" with HTML entity
GLOBAL_CTA = [
    (
        "We&#x27;re ready to get started on your next creative project. All you need to do is hit the button below",
        "Upload your lab manual and start your first AI viva session \u2014 free, with no setup required.",
    ),
]

# Apply
for fname, pairs in [
    ("about-us.html",   ABOUT_EXTRA + GLOBAL_CTA),
    ("contact-us.html", FAQ_TAB1_ANSWERS + FAQ_TAB2_ANSWERS + FAQ_TAB3_ANSWERS + GLOBAL_CTA),
    ("work.html",       FAQ_TAB1_ANSWERS + WORK_FAQ_TAB2 + WORK_FAQ_TAB3 + GLOBAL_CTA),
]:
    patch(ROOT / fname, pairs)

# Remove self
(ROOT / "fix_pages2.py").unlink(missing_ok=True)
(ROOT / "fix_pages.py").unlink(missing_ok=True)
print("\nAll done. Temp scripts removed.")
