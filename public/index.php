<?php
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$queryString = $_SERVER['QUERY_STRING'] ?? '';

// Check if request is from a social media crawler
$isCrawler = preg_match('/facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot/i', $userAgent);

if ($isCrawler) {
    $edgeFunctionBase = 'https://xbgxnwzluykgxcxujeay.supabase.co/functions/v1/og-news';
    
    // Match /news/:category/:postNumber
    if (preg_match('#^/news/([^/]+)/(\d+)#', $requestUri, $matches)) {
        $category = urlencode($matches[1]);
        $postNumber = $matches[2];
        header("Location: {$edgeFunctionBase}?category={$category}&post_number={$postNumber}", true, 302);
        exit;
    }
    
    // Match /news?id=...
    if (preg_match('#^/news#', $requestUri) && preg_match('/id=([a-f0-9-]+)/i', $queryString, $matches)) {
        $id = $matches[1];
        header("Location: {$edgeFunctionBase}?id={$id}", true, 302);
        exit;
    }
}

// For normal users, serve the SPA
include __DIR__ . '/index.html';
