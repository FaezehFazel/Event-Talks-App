import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def strip_html_tags(html_str):
    # Remove script and style tags
    clean = re.sub(r'<(script|style).*?>.*?</\1>', '', html_str, flags=re.DOTALL)
    # Remove all other HTML tags
    clean = re.sub(r'<[^>]*>', '', clean)
    # Unescape HTML entities (e.g. &amp; -> &, &lt; -> <)
    clean = html.unescape(clean)
    # Normalize whitespace
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def parse_html_content(content_html):
    # We find all h3 tags to split features/issues/announcements within one feed entry
    # The format is typically: <h3>Type</h3> <p>Description...</p>
    sections = re.split(r'<h3>(.*?)</h3>', content_html)
    
    if len(sections) < 2:
        # If there are no <h3> headings, return the whole content as a general 'Update'
        return [{
            'type': 'Update',
            'html': content_html.strip(),
            'text': strip_html_tags(content_html)
        }]
    
    items = []
    # sections[0] is everything before the first <h3> (usually empty)
    # Then we alternate: sections[1]=type, sections[2]=html content, sections[3]=type, etc.
    for i in range(1, len(sections), 2):
        note_type = sections[i].strip()
        note_html = sections[i+1].strip() if i+1 < len(sections) else ''
        
        # Format list styling in HTML slightly if needed to look good in our UI
        # We will keep raw HTML but generate text for tweeting
        note_text = strip_html_tags(note_html)
        
        items.append({
            'type': note_type,
            'html': note_html,
            'text': note_text
        })
    return items

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    feed_title = root.find('atom:title', namespaces)
    feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
    
    entries = []
    for entry_node in root.findall('atom:entry', namespaces):
        title = entry_node.find('atom:title', namespaces).text # The date, e.g. "June 22, 2026"
        updated = entry_node.find('atom:updated', namespaces).text
        
        link_node = entry_node.find("atom:link[@rel='alternate']", namespaces)
        link = link_node.attrib['href'] if link_node is not None else ''
        
        # If the link doesn't contain a fragment, we can construct one
        # using the title (date) to jump directly to the section on Google's docs page.
        if link and not '#' in link:
            # Format title like "June_22_2026"
            fragment = title.replace(' ', '_').replace(',', '')
            link = f"{link}#{fragment}"
            
        content_node = entry_node.find('atom:content', namespaces)
        content_html = content_node.text if content_node is not None else ''
        
        # Split entry into individual updates (Features, Issues, Announcements)
        updates = parse_html_content(content_html)
        
        for index, update in enumerate(updates):
            entries.append({
                'id': f"{title.replace(' ', '-').lower()}-{index}",
                'date': title,
                'updated': updated,
                'link': link,
                'type': update['type'],
                'html': update['html'],
                'text': update['text']
            })
            
    return {
        'title': feed_title_text,
        'entries': entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        data = fetch_and_parse_feed()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Bind to all interfaces for local testing
    app.run(host='0.0.0.0', port=5000, debug=True)
