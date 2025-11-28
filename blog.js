// blog.js - Single template loader for Sahyadri Insights

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read slug from URL
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    const titleEl = document.getElementById('blog-title');
    const metaEl = document.getElementById('blog-meta');
    const tagEl = document.getElementById('blog-tag');
    const bodyEl = document.getElementById('blog-body');
    const errorEl = document.getElementById('blog-error');
    const ctaEl = document.getElementById('blog-cta');

    if (!slug) {
        if (titleEl) titleEl.textContent = 'Article not found';
        if (metaEl) metaEl.textContent = 'No article slug was provided in the URL.';
        if (errorEl) errorEl.style.display = 'block';
        return;
    }

    try {
        // 2. Create Supabase client using shared config
        const { createClient } = supabase;
        const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

        // 3. Fetch article by slug from blog_posts table
        // Expected columns: slug, title, tag, author, region, body_html, created_at
        const { data: article, error } = await _supabase
            .from('blog_posts')
            .select('title, slug, tag, author, region, body_html, created_at')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !article) {
            if (titleEl) titleEl.textContent = 'Article not found';
            if (metaEl) metaEl.textContent = 'We couldn’t find this insight. It may have been unpublished.';
            if (errorEl) errorEl.style.display = 'block';
            return;
        }

        // 4. Populate page
        document.title = `${article.title} - Sahyadri Insights`;

        if (titleEl) titleEl.textContent = article.title || '';
        if (tagEl) tagEl.textContent = article.tag || 'Insights';

        if (metaEl) {
            const parts = [];
            if (article.author) parts.push(article.author);
            if (article.region) parts.push(article.region);
            if (article.created_at) {
                const dt = new Date(article.created_at);
                parts.push(dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
            }
            metaEl.textContent = parts.join(' • ') || 'Sahyadri Constructions Insights';
        }

        if (bodyEl) {
            // Assume body_html has been sanitized server-side in CMS
            bodyEl.innerHTML = article.body_html || '<p>No content available.</p>';
        }

        if (ctaEl) {
            ctaEl.style.display = 'block';
        }
    } catch (e) {
        if (titleEl) titleEl.textContent = 'Error loading article';
        if (metaEl) metaEl.textContent = 'Something went wrong while fetching this insight.';
        if (errorEl) errorEl.style.display = 'block';
        // Optional: log e to console for debugging
        console.error('Blog load error', e);
    }
});


