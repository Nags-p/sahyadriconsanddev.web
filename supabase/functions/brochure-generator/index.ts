// Import using the shorter names from the import_map.json
import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";
import puppeteer from "puppeteer";

// --- TEMPLATE FOR THE BROCHURE HTML ---
// This is your brochure-generator.html, converted to a function.
const getBrochureHtml = (projectsHtml: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #f8fafc; -webkit-print-color-adjust: exact; }
        .page { width: 210mm; height: 297mm; background: #f8fafc; display: flex; flex-direction: column; color: #1e293b; position: relative; overflow: hidden; page-break-after: always; }
        h1, h2, h3 { font-weight: 700; } h1 { font-size: 36px; } h2 { font-size: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 10px; display: inline-block; margin-bottom: 25px; }
        p { line-height: 1.7; color: #475569; }
        .content-pad { padding: 40px; }
        .cover-bg { height: 65%; background: url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1600&auto=format&fit=crop') no-repeat center/cover; }
        .cover-content { flex: 1; padding: 40px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; display: flex; flex-direction: column; }
        .cover-content h1 { font-size: 48px; font-weight: 800; line-height: 1.1; }
        .cover-content .tagline { font-size: 22px; font-weight: 300; opacity: 0.9; margin-top: 10px; border-left: 3px solid #3b82f6; padding-left: 15px; }
        .project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .project-item { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }
        .project-item img { width: 100%; height: 180px; object-fit: cover; }
        .project-item-details { padding: 15px; } .project-item h4 { margin: 0 0 5px 0; font-size: 16px; } .project-item p { margin: 0; font-size: 13px; color: #64748b; }
        .back-cover { padding: 40px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box; background: #1e293b; color: white;}
        .contact-item { margin-bottom: 20px; display: flex; align-items: center; gap: 15px; font-size: 18px; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="page">
        <div class="cover-bg"></div>
        <div class="cover-content">
            <h1>Sahyadri Constructions & Developers</h1>
            <p class="tagline">Engineering Excellence. Building Trust.</p>
        </div>
    </div>
    <div class="page">
        <div class="content-pad">
            <h2>Featured Projects</h2>
            <div class="project-grid">${projectsHtml}</div>
        </div>
    </div>
    <div class="page">
         <div class="back-cover">
            <div>
                <h1 style="color: white; font-weight: 800;">Let's Build Together</h1>
                <p style="opacity: 0.8; font-size: 18px;">Contact us today for a free consultation.</p>
            </div>
            <div>
                <div class="contact-item"><span>📞</span><span>+91 79756 76745</span></div>
                <div class="contact-item"><span>📧</span><span>sahyadriconstructions449@gmail.com</span></div>
                <div class="contact-item"><span>📍</span><span>2nd Main Road, Ashok Nagar, Mandya</span></div>
            </div>
        </div>
    </div>
</body>
</html>
`;

// --- THIS IS THE CORRECTED SERVE FUNCTION ---
serve(async (_req: Request) => { // Changed 'req' to '_req' and added the 'Request' type
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    // ... (The rest of your function logic remains exactly the same) ...
    // 1. Fetch live project data...
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, title, scope, gallery_images")
      .eq("is_featured", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(4);

    if (error) throw error;

    // 2. Generate HTML...
    const projectsHtml = projects.map(project => {
      // ...
    }).join('');

    // 3. Inject into template...
    const finalHtml = getBrochureHtml(projectsHtml);
    
    // 4. Launch Puppeteer...
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // 5. Send the PDF...
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sahyadri-Constructions-Brochure.pdf"`,
      },
    });

  } catch (err) {
    console.error("Error generating brochure:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate brochure." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});