# ═══════════════════════════════════════════════════════════════
#  MANEUVER DRIVING SCHOOL — LAUNCH CHECKLIST & DEPLOYMENT GUIDE
#  maneuverdrivingschool.ca
# ═══════════════════════════════════════════════════════════════

## FINAL FILE STRUCTURE
```
maneuverdrivingschool.ca/
├── index.html               ← Main page (all sections)
├── style.css                ← All styles
├── script.js                ← All JavaScript
├── sitemap.xml              ← Google sitemap
├── robots.txt               ← Crawler rules
├── .htaccess                ← Apache config (if using cPanel/Apache)
├── nginx.conf               ← Nginx config (if using VPS)
├── browserconfig.xml        ← MS Edge tiles
└── assets/
    ├── logoonly.webp        ← Footer logo
    ├── logowithtext.webp    ← Nav + loader logo
    ├── instructor.webp      ← About section main photo
    ├── vancouverroads.webp  ← About section photo
    ├── citydriving.webp     ← About section photo
    ├── og-image.webp        ← Social share image (1200×630px) ← CREATE THIS
    └── favicon/
        ├── favicon.ico          ← Multi-size ICO (16,32,48px)
        ├── favicon.svg          ← SVG favicon (modern browsers)
        ├── favicon-96x96.png    ← Standard favicon
        ├── apple-touch-icon.png ← iOS home screen (180×180)
        ├── icon-192x192.png     ← Android PWA icon
        ├── icon-512x512.png     ← Android PWA splash icon
        ├── site.webmanifest     ← PWA manifest
        └── browserconfig.xml    ← MS Edge/IE tiles
```

---

## STEP 1 — GENERATE FAVICONS

Option A (recommended — free, perfect quality):
1. Open https://realfavicongenerator.net/
2. Upload your `assets/logoonly.webp`
3. Set background color: #0A1628 (navy)
4. Download the package
5. Extract into `assets/favicon/`

Option B (automated script included):
```bash
pip install cairosvg pillow
python generate_favicons.py
```

---

## STEP 2 — CREATE OG IMAGE

Create `assets/og-image.webp` at exactly 1200×630px.
- Use your `logowithtext.webp` centred on a navy (#0A1628) background
- Add tagline: "Driving School in Vancouver, BC"
- Export as WebP at 85% quality

Free tools: Canva, Figma, or Adobe Express

---

## STEP 3 — UPDATE CANONICAL URL

In `index.html`, verify this matches your actual domain:
```html
<link rel="canonical" href="https://maneuverdrivingschool.ca/" />
```
Also update all `og:url` and JSON-LD `@id` / `url` fields if your domain differs.

---

## STEP 4 — DEPLOY FILES

### Shared hosting (cPanel, Namecheap, GoDaddy, etc.)
1. Upload ALL files to `public_html/`
2. Ensure `.htaccess` is uploaded (may be hidden — enable "Show hidden files")
3. SSL: Enable "Force HTTPS" in cPanel → SSL/TLS

### Netlify (free, recommended for simplicity)
1. Go to https://app.netlify.com/
2. Drag and drop your entire project folder
3. Set custom domain: maneuverdrivingschool.ca
4. SSL is automatic (Let's Encrypt)
5. Add `_redirects` file: `/* /index.html 200`

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### VPS (Apache/Nginx)
- Use `.htaccess` for Apache
- Use `nginx.conf` for Nginx
- Get SSL: `sudo certbot --nginx -d maneuverdrivingschool.ca`

---

## STEP 5 — GOOGLE SEARCH CONSOLE

1. Go to https://search.google.com/search-console/
2. Add property: `https://maneuverdrivingschool.ca/`
3. Verify ownership (HTML file or DNS TXT record)
4. Submit sitemap: Sitemaps → Enter URL → `https://maneuverdrivingschool.ca/sitemap.xml`
5. Request indexing on the main URL

---

## STEP 6 — GOOGLE BUSINESS PROFILE (critical for local SEO)

1. Go to https://business.google.com/
2. Search "Maneuver Driving School" — claim if already listed
3. Fill in ALL fields:
   - Category: "Driving School"
   - Address: 5112 Elgin St, Vancouver, BC
   - Phone: +1 778-723-2850
   - Website: https://maneuverdrivingschool.ca
   - Hours: Mon-Fri 8am-8pm, Sat-Sun 9am-6pm
4. Add photos: logo, instructor, car, Vancouver area
5. Enable "Bookings" if applicable
6. Respond to ALL Google Reviews (boosts ranking)

---

## STEP 7 — BING WEBMASTER TOOLS

1. https://www.bing.com/webmasters/
2. Import from Google Search Console (easiest)
3. Submit sitemap

---

## STEP 8 — LOCAL CITATIONS (boosts "near me" rankings)

Submit your NAP (Name, Address, Phone) consistently to:
- [ ] Yellow Pages Canada: yellowpages.ca
- [ ] Yelp Canada: yelp.ca
- [ ] Apple Maps: mapsconnect.apple.com
- [ ] Bing Places: bingplaces.com
- [ ] Facebook Business Page (already have)
- [ ] BBB Vancouver: bbb.org
- [ ] Canada411: canada411.ca
- [ ] Foursquare: foursquare.com

NAP to use consistently everywhere:
```
Maneuver Driving School
5112 Elgin St, Vancouver, BC, Canada
+1 778-723-2850
https://maneuverdrivingschool.ca
```

---

## STEP 9 — PAGE SPEED (Core Web Vitals)

Test at: https://pagespeed.web.dev/
Target scores: Performance 90+, SEO 100, Accessibility 90+

Key optimizations already implemented:
✓ WebP images with width/height attributes (prevents CLS)
✓ Font preconnect and dns-prefetch
✓ Logo preloaded (LCP optimization)
✓ Lazy loading on below-fold images
✓ CSS/JS minification recommended (see below)
✓ Gzip via .htaccess

Additional recommended steps:
- Minify CSS: https://cssminifier.com/
- Minify JS: https://javascript-minifier.com/
- Compress images further: https://squoosh.app/

---

## STEP 10 — POST-LAUNCH MONITORING

Weekly:
- [ ] Check Google Search Console for crawl errors
- [ ] Check Google Business Profile for new reviews → RESPOND WITHIN 24h

Monthly:
- [ ] Track keyword rankings (Google Search Console → Performance)
- [ ] Check Core Web Vitals report in GSC
- [ ] Update sitemap `<lastmod>` when content changes

---

## TARGET KEYWORDS TO TRACK

Primary (highest value):
- "driving school in Vancouver"
- "driving school Vancouver BC"
- "driving lessons Vancouver"

Secondary:
- "road test preparation Vancouver"
- "Class 5 road test Vancouver"
- "driving instructor Vancouver"
- "beginner driving lessons Vancouver"
- "adult driving lessons Vancouver"
- "newcomer driving school Vancouver"

Long-tail:
- "best driving school in Vancouver BC"
- "affordable driving lessons Vancouver"
- "driving school near me Vancouver"
- "Class 5 road test prep Vancouver BC"

---

## SEO FEATURES IMPLEMENTED IN THIS CODEBASE

✓ Title tag: "Driving School in Vancouver BC | Maneuver Driving School..."
✓ Meta description: 155 chars, keyword-rich
✓ 14 targeted meta keywords
✓ Canonical URL tag
✓ Open Graph (og:) tags for Facebook/LinkedIn sharing
✓ Twitter Card tags
✓ lang="en-CA" on <html> (Canadian English signal)
✓ Geo meta tags (geo.region, geo.placename, geo.position)
✓ Local Business JSON-LD schema
✓ DrivingSchool schema type
✓ FAQPage schema (FAQ section → Google rich results)
✓ WebSite schema
✓ BreadcrumbList schema
✓ AggregateRating schema (stars in search results)
✓ Review schema (2 reviews)
✓ OfferCatalog schema (all 5 packages)
✓ All image alt texts are keyword-rich and descriptive
✓ Semantic HTML5 structure (header, main, section, footer)
✓ H1 on hero with location keyword
✓ H2/H3 hierarchy throughout page
✓ Footer SEO text with service area keywords
✓ robots.txt with sitemap reference
✓ sitemap.xml with image sitemap extension
✓ Favicon set (all sizes for all platforms)
✓ PWA manifest (site.webmanifest)
✓ .htaccess with HTTPS redirect, caching, GZIP, security headers
