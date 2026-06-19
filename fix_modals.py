import re

with open("src/components/VigiaDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# find Modals block
start_idx = content.find("{/* Modals for Suspicious Persons */}")
end_idx = content.find("<style>{`")

if start_idx != -1 and end_idx != -1:
    # Also find the preceding whitespace to capture the whole block properly
    block_start = content.rfind("\n", 0, start_idx)
    if block_start == -1: block_start = start_idx
    
    # We want to extract up to the closing tags just before <style>
    # Actually, let's just extract from start_idx to end_idx
    modals_block = content[start_idx:end_idx]
    
    # Remove it from original location
    content = content[:start_idx] + content[end_idx:]
    
    # Insert it right before the second to last </div>
    # The bottom bar is at the end.
    # The structure at the end is:
    #     </div>
    #   );
    # }
    final_div_idx = content.rfind("</div>\n  );\n}")
    if final_div_idx != -1:
        content = content[:final_div_idx] + modals_block + "\n    " + content[final_div_idx:]
        print("Success")
    else:
        # let's try finding `</div>\r\n  );\r\n}`
        final_div_idx = content.rfind("</div>\r\n  );\r\n}")
        if final_div_idx != -1:
            content = content[:final_div_idx] + modals_block + "\n    " + content[final_div_idx:]
            print("Success (CRLF)")
        else:
            # maybe there's a double </div>?
            final_div_idx = content.rfind("</div>\n    </div>\n  );")
            if final_div_idx != -1:
                content = content[:final_div_idx] + modals_block + "\n    " + content[final_div_idx:]
                print("Success (double div)")
            else:
                print("Could not find final div")
else:
    print("Could not find Modals block or style block")

with open("src/components/VigiaDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
