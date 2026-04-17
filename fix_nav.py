import re

def sync_navbar_and_footer():
    with open('index.html', 'r', encoding='utf-8') as f:
        idx_content = f.read()

    # Find the start of navbar
    nav_start_match = re.search(r'<div[^>]*class="[^"]*navbar w-nav[^"]*"[^>]*>', idx_content)
    if not nav_start_match:
        print("Navbar start not found in index")
        return
        
    start_idx = nav_start_match.start()
    
    # We know the navbar ends before <section class="hero w-container"> or similar.
    # In index.html, next is <div class="overflow-hidden"> wrapper, but navbar is inside it.
    # Let's extract navbar by index bounds.
    end_idx = idx_content.find('</nav>', start_idx)
    end_idx = idx_content.find('</div></div>', end_idx) + 12 # end of w-nav
    navbar_html = idx_content[start_idx:end_idx]

    # footer
    foot_start = idx_content.find('<footer')
    foot_end = idx_content.find('</footer>', foot_start) + 9
    footer_html = idx_content[foot_start:foot_end]

    with open('contact-us.html', 'r', encoding='utf-8') as f:
        contact_html = f.read()
        
    old_nav_match = re.search(r'<div[^>]*class="[^"]*navbar w-nav[^"]*"[^>]*>', contact_html)
    old_nav_start = old_nav_match.start()
    old_nav_end = contact_html.find('</nav>', old_nav_start)
    old_nav_end = contact_html.find('</div></div>', old_nav_end) + 12
    
    old_nav_html = contact_html[old_nav_start:old_nav_end]
    contact_html = contact_html.replace(old_nav_html, navbar_html)
    
    print("Replaced navbar in contact")

    old_foot_start = contact_html.find('<footer')
    old_foot_end = contact_html.find('</footer>', old_foot_start) + 9
    old_foot_html = contact_html[old_foot_start:old_foot_end]
    contact_html = contact_html.replace(old_foot_html, footer_html)
    
    with open('contact-us.html', 'w', encoding='utf-8') as f:
        f.write(contact_html)

sync_navbar_and_footer()
