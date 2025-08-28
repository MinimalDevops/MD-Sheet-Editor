#!/bin/bash

# Generate n8n templates based on .env configuration
# This script creates Fetch and Update templates with dynamic switches based on docs and sheets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists in md-sheet-editor directory
ENV_FILE="../md-sheet-editor/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found in md-sheet-editor directory. Please create one with the required configuration."
    exit 1
fi

# Load environment variables
source "$ENV_FILE"

# Validate required variables
if [ -z "$GOOGLE_SHEETS_OAUTH2_API_ID" ]; then
    print_error "GOOGLE_SHEETS_OAUTH2_API_ID is required in .env file"
    exit 1
fi

if [ -z "$REACT_APP_DOC_SHEET_CONFIG" ]; then
    print_error "REACT_APP_DOC_SHEET_CONFIG is required in .env file"
    exit 1
fi

print_status "Generating n8n templates..."

# Create output directory for generated templates
OUTPUT_DIR="output"
mkdir -p "$OUTPUT_DIR"

# Generate unique IDs for nodes
generate_id() {
    openssl rand -hex 16
}

generate_webhook_id() {
    openssl rand -hex 4 | sed 's/\([a-f0-9]\{8\}\)/\1-\1-\1-\1/'
}

# Parse REACT_APP_DOC_SHEET_CONFIG (format: "doc1:sheet1[matchCol1],sheet2[matchCol2];doc2:sheet3[matchCol3]")
parse_docs_config() {
    echo "$REACT_APP_DOC_SHEET_CONFIG" | tr ';' '\n' | while IFS=':' read -r doc sheets; do
        echo "$doc:$sheets"
    done
}

# Extract sheet name from sheet[matchCol] format
extract_sheet_name() {
    echo "$1" | sed 's/\[.*\]//'
}

# Extract matching column from sheet[matchCol] format
extract_matching_column() {
    echo "$1" | sed -n 's/.*\[\(.*\)\].*/\1/p'
}

# Generate Fetch template
generate_fetch_template() {
    print_status "Generating Fetch template..."
    
    local template_name="${REACT_APP_N8N_FETCH_WEBHOOK:-Fetch-Rows-Multi}"
    local webhook_id=$(generate_webhook_id)
    local webhook_node_id=$(generate_id)
    local respond_node_id=$(generate_id)
    local doc_switch_id=$(generate_id)
    
    # Create temporary files for building JSON
    local temp_file=$(mktemp)
    local nodes_file=$(mktemp)
    local connections_file=$(mktemp)
    
    # Start building the template
    cat > "$temp_file" << EOF
{
  "name": "$template_name",
  "nodes": [
EOF

    # Add webhook node
    cat >> "$temp_file" << EOF
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "$template_name",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "id": "$webhook_node_id",
      "name": "Webhook",
      "webhookId": "$webhook_id"
    },
EOF

    # Add respond node
    cat >> "$temp_file" << EOF
    {
      "parameters": {
        "respondWith": "allIncomingItems",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [880, 0],
      "id": "$respond_node_id",
      "name": "Respond to Webhook"
    }
EOF

    # Generate doc switch rules and get rows nodes
    local switch_rules=""
    local get_rows_nodes=""
    local get_rows_connections=""
    local doc_switch_connections=""
    local position_y=0
    local first_rule=true
    local doc_index=0
    
    while IFS=':' read -r doc sheets; do
        if [ -n "$doc" ] && [ -n "$sheets" ]; then
            # Add switch rule for this doc
            if [ "$first_rule" = true ]; then
                first_rule=false
            else
                switch_rules="$switch_rules,"
            fi
            switch_rules="$switch_rules
            {
              \"conditions\": {
                \"options\": {
                  \"caseSensitive\": true,
                  \"leftValue\": \"\",
                  \"typeValidation\": \"strict\",
                  \"version\": 2
                },
                \"conditions\": [
                  {
                    \"leftValue\": \"={{ \$json.body.doc }}\",
                    \"rightValue\": \"$doc\",
                    \"operator\": {
                      \"type\": \"string\",
                      \"operation\": \"equals\"
                    },
                    \"id\": \"$(generate_id)\"
                  }
                ],
                \"combinator\": \"and\"
              }
            }"
            
            # Generate ONE Get Row(s) node per document (sheet is dynamic)
            local get_rows_id=$(generate_id)
            local doc_id=$(generate_id)
            local node_name="Get row(s) in $doc"
            
            get_rows_nodes="$get_rows_nodes,
    {
      \"parameters\": {
        \"documentId\": {
          \"__rl\": true,
          \"value\": \"$doc_id\",
          \"mode\": \"list\",
          \"cachedResultName\": \"$doc\",
          \"cachedResultUrl\": \"https://docs.google.com/spreadsheets/d/$doc_id/edit?usp=drivesdk\"
        },
        \"sheetName\": {
          \"__rl\": true,
          \"value\": \"={{ \$('Webhook').item.json.body.sheet }}\",
          \"mode\": \"name\"
        },
        \"options\": {}
      },
      \"type\": \"n8n-nodes-base.googleSheets\",
      \"typeVersion\": 4.6,
      \"position\": [660, $position_y],
      \"id\": \"$get_rows_id\",
      \"name\": \"$node_name\",
      \"credentials\": {
        \"googleSheetsOAuth2Api\": {
          \"id\": \"$GOOGLE_SHEETS_OAUTH2_API_ID\",
          \"name\": \"Google Sheets account\"
        }
      }
    }"
            
            get_rows_connections="$get_rows_connections,
    \"$node_name\": {
      \"main\": [
        [
          {
            \"node\": \"Respond to Webhook\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]
      ]
    }"
            
            position_y=$((position_y + 200))
            
            # Add Doc Switch connection for this document (direct to Get Rows node)
            if [ -n "$doc_switch_connections" ]; then
                doc_switch_connections="$doc_switch_connections,"
            fi
            doc_switch_connections="$doc_switch_connections
        [
          {
            \"node\": \"$node_name\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]"
            
            doc_index=$((doc_index + 1))
        fi
    done < <(parse_docs_config)
    
    # Add doc switch node
    cat >> "$temp_file" << EOF
,
    {
      "parameters": {
        "rules": {
          "values": [$switch_rules]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.2,
      "position": [320, 0],
      "id": "$doc_switch_id",
      "name": "Doc Switch"
    }$get_rows_nodes
  ],
  "pinData": {},
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Doc Switch",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }$get_rows_connections,
    "Doc Switch": {
      "main": [$doc_switch_connections]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner"
  },
  "versionId": "$(generate_id)",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "$(generate_id)"
  },
  "id": "$(generate_id)",
  "tags": []
}
EOF

    # Copy to final location
    cp "$temp_file" "$OUTPUT_DIR/${template_name}.json"
    rm "$temp_file"
    
    print_status "Fetch template generated: $OUTPUT_DIR/${template_name}.json"
}

# Generate Delete template
generate_delete_template() {
    print_status "Generating Delete template..."
    
    local template_name="${REACT_APP_N8N_DELETE_WEBHOOK:-Delete-Row}"
    local webhook_id=$(generate_webhook_id)
    local webhook_node_id=$(generate_id)
    local respond_node_id=$(generate_id)
    local doc_switch_id=$(generate_id)
    local code_node_id=$(generate_id)
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Start building the template
    cat > "$temp_file" << EOF
{
  "name": "$template_name",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "$template_name",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [-560, -16],
      "id": "$webhook_node_id",
      "name": "Webhook",
      "webhookId": "$webhook_id"
    },
    {
      "parameters": {
        "respondWith": "allIncomingItems",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [600, -16],
      "id": "$respond_node_id",
      "name": "Respond to Webhook"
    },
    {
      "parameters": {
        "jsCode": "const data = { ...items[0].json.body };\\n\\nreturn [\\n  {\\n    json: data\\n  }\\n];\\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-200, -16],
      "id": "$code_node_id",
      "name": "Code1"
    }
EOF

    # Generate doc switch rules and delete nodes
    local doc_switch_rules=""
    local delete_nodes=""
    local delete_connections=""
    local doc_switch_connections=""
    local position_y=0
    local first_doc_rule=true
    local doc_index=0
    
    while IFS=':' read -r doc sheets; do
        if [ -n "$doc" ] && [ -n "$sheets" ]; then
            local delete_node_id=$(generate_id)
            local doc_id=$(generate_id)
            
            # Add doc switch rule
            if [ "$first_doc_rule" = true ]; then
                first_doc_rule=false
            else
                doc_switch_rules="$doc_switch_rules,"
            fi
            doc_switch_rules="$doc_switch_rules
            {
              \"conditions\": {
                \"options\": {
                  \"caseSensitive\": true,
                  \"leftValue\": \"\",
                  \"typeValidation\": \"strict\",
                  \"version\": 2
                },
                \"conditions\": [
                  {
                    \"leftValue\": \"={{ \$('Webhook').item.json.body.doc }}\",
                    \"rightValue\": \"$doc\",
                    \"operator\": {
                      \"type\": \"string\",
                      \"operation\": \"equals\"
                    },
                    \"id\": \"$(generate_id)\"
                  }
                ],
                \"combinator\": \"and\"
              }
            }"
            
            # Generate Delete Row node for this document
            local node_name="Delete rows or columns from sheet - $doc"
            
            delete_nodes="$delete_nodes,
    {
      \"parameters\": {
        \"operation\": \"delete\",
        \"documentId\": {
          \"__rl\": true,
          \"value\": \"$doc_id\",
          \"mode\": \"list\",
          \"cachedResultName\": \"$doc\",
          \"cachedResultUrl\": \"https://docs.google.com/spreadsheets/d/$doc_id/edit?usp=drivesdk\"
        },
        \"sheetName\": {
          \"__rl\": true,
          \"value\": \"={{ \$('Webhook').item.json.body.sheet }}\",
          \"mode\": \"name\"
        },
        \"startIndex\": \"={{ \$('Webhook').item.json.body.row_number }}\"
      },
      \"type\": \"n8n-nodes-base.googleSheets\",
      \"typeVersion\": 4.6,
      \"position\": [400, $position_y],
      \"id\": \"$delete_node_id\",
      \"name\": \"$node_name\",
      \"credentials\": {
        \"googleSheetsOAuth2Api\": {
          \"id\": \"$GOOGLE_SHEETS_OAUTH2_API_ID\",
          \"name\": \"Google Sheets account\"
        }
      }
    }"
            
            delete_connections="$delete_connections,
    \"$node_name\": {
      \"main\": [
        [
          {
            \"node\": \"Respond to Webhook\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]
      ]
    }"
            
            # Add Doc Switch connection for this document
            if [ -n "$doc_switch_connections" ]; then
                doc_switch_connections="$doc_switch_connections,"
            fi
            doc_switch_connections="$doc_switch_connections
        [
          {
            \"node\": \"$node_name\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]"
            
            position_y=$((position_y + 200))
            doc_index=$((doc_index + 1))
        fi
    done < <(parse_docs_config)
    
    # Add doc switch node
    cat >> "$temp_file" << EOF
,
    {
      "parameters": {
        "rules": {
          "values": [$doc_switch_rules]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.2,
      "position": [200, -16],
      "id": "$doc_switch_id",
      "name": "Doc Switch"
    }$delete_nodes
  ],
  "pinData": {},
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Code1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }$delete_connections,
    "Doc Switch": {
      "main": [$doc_switch_connections]
    },
    "Code1": {
      "main": [
        [
          {
            "node": "Doc Switch",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner"
  },
  "versionId": "$(generate_id)",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "$(generate_id)"
  },
  "id": "$(generate_id)",
  "tags": []
}
EOF

    # Copy to final location
    cp "$temp_file" "$OUTPUT_DIR/${template_name}.json"
    rm "$temp_file"
    
    print_status "Delete template generated: $OUTPUT_DIR/${template_name}.json"
}

# Generate Update template
generate_update_template() {
    print_status "Generating Update template..."
    
    local template_name="${REACT_APP_N8N_UPDATE_WEBHOOK:-Update-Rows-Multi}"
    local webhook_id=$(generate_webhook_id)
    local webhook_node_id=$(generate_id)
    local respond_node_id=$(generate_id)
    local doc_switch_id=$(generate_id)
    local code_node_id=$(generate_id)
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Start building the template
    cat > "$temp_file" << EOF
{
  "name": "$template_name",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "$template_name",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [-240, 0],
      "id": "$webhook_node_id",
      "name": "Webhook",
      "webhookId": "$webhook_id"
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "Row Updated",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [1320, 0],
      "id": "$respond_node_id",
      "name": "Respond to Webhook"
    },
    {
      "parameters": {
        "jsCode": "const data = { ...items[0].json.body };\\n\\n// Remove unwanted keys\\ndelete data.doc;\\ndelete data.sheet;\\ndelete data.rowIndex;\\n\\nreturn [\\n  {\\n    json: data\\n  }\\n];\\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [0, 0],
      "id": "$code_node_id",
      "name": "Code1"
    }
EOF

    # Generate doc switch rules and sheet switches
    local doc_switch_rules=""
    local sheet_switches=""
    local append_nodes=""
    local connections=""
    local doc_switch_connections=""
    local position_y=0
    local first_doc_rule=true
    local doc_index=0
    
    while IFS=':' read -r doc sheets; do
        if [ -n "$doc" ] && [ -n "$sheets" ]; then
            local sheet_switch_id=$(generate_id)
            local doc_id=$(generate_id)
            
            # Add doc switch rule
            if [ "$first_doc_rule" = true ]; then
                first_doc_rule=false
            else
                doc_switch_rules="$doc_switch_rules,"
            fi
            doc_switch_rules="$doc_switch_rules
            {
              \"conditions\": {
                \"options\": {
                  \"caseSensitive\": true,
                  \"leftValue\": \"\",
                  \"typeValidation\": \"strict\",
                  \"version\": 2
                },
                \"conditions\": [
                  {
                    \"leftValue\": \"={{ \$('Webhook').item.json.body.doc }}\",
                    \"rightValue\": \"$doc\",
                    \"operator\": {
                      \"type\": \"string\",
                      \"operation\": \"equals\"
                    },
                    \"id\": \"$(generate_id)\"
                  }
                ],
                \"combinator\": \"and\"
              }
            }"
            
            # Generate sheet switch rules
            local sheet_switch_rules=""
            local sheet_connections=""
            local first_sheet_rule=true
            IFS=',' read -ra SHEET_ARRAY <<< "$sheets"
            for sheet_config in "${SHEET_ARRAY[@]}"; do
                local sheet=$(extract_sheet_name "$sheet_config")
                local matching_column=$(extract_matching_column "$sheet_config")
                local append_node_id=$(generate_id)
                local node_name="Append or update row in $doc - $sheet"
                
                # Add sheet switch rule
                if [ "$first_sheet_rule" = true ]; then
                    first_sheet_rule=false
                else
                    sheet_switch_rules="$sheet_switch_rules,"
                fi
                sheet_switch_rules="$sheet_switch_rules
                {
                  \"conditions\": {
                    \"options\": {
                      \"caseSensitive\": true,
                      \"leftValue\": \"\",
                      \"typeValidation\": \"strict\",
                      \"version\": 2
                    },
                    \"conditions\": [
                      {
                        \"leftValue\": \"={{ \$('Webhook').item.json.body.sheet }}\",
                        \"rightValue\": \"$sheet\",
                        \"operator\": {
                          \"type\": \"string\",
                          \"operation\": \"equals\"
                        },
                        \"id\": \"$(generate_id)\"
                      }
                    ],
                    \"combinator\": \"and\"
                  }
                }"
                
                # Generate matching columns JSON and schema
                local matching_columns_json=""
                local schema_json=""
                if [ -n "$matching_column" ]; then
                    matching_columns_json="[\"$matching_column\"]"
                    schema_json="[
            {
              \"id\": \"$matching_column\",
              \"displayName\": \"$matching_column\",
              \"required\": false,
              \"defaultMatch\": false,
              \"display\": true,
              \"type\": \"string\",
              \"canBeUsedToMatch\": true,
              \"removed\": false
            }
          ]"
                else
                    matching_columns_json="[]"
                    schema_json="[]"
                fi
                
                # Generate append/update node
                append_nodes="$append_nodes,
    {
      \"parameters\": {
        \"operation\": \"appendOrUpdate\",
        \"documentId\": {
          \"__rl\": true,
          \"value\": \"$doc_id\",
          \"mode\": \"list\",
          \"cachedResultName\": \"$doc\",
          \"cachedResultUrl\": \"https://docs.google.com/spreadsheets/d/$doc_id/edit?usp=drivesdk\"
        },
        \"sheetName\": {
          \"__rl\": true,
          \"value\": \"$sheet\",
          \"mode\": \"name\"
        },
        \"columns\": {
          \"mappingMode\": \"autoMapInputData\",
          \"value\": {},
          \"matchingColumns\": $matching_columns_json,
          \"schema\": $schema_json,
          \"attemptToConvertTypes\": false,
          \"convertFieldsToString\": false
        },
        \"options\": {
          \"locationDefine\": {
            \"values\": {
              \"firstDataRow\": \"={{ \$('Webhook').item.json.body.rowIndex }}\"
            }
          },
          \"useAppend\": true
        }
      },
      \"type\": \"n8n-nodes-base.googleSheets\",
      \"typeVersion\": 4.6,
      \"position\": [920, $position_y],
      \"id\": \"$append_node_id\",
      \"name\": \"$node_name\",
      \"credentials\": {
        \"googleSheetsOAuth2Api\": {
          \"id\": \"$GOOGLE_SHEETS_OAUTH2_API_ID\",
          \"name\": \"Google Sheets account\"
        }
      }
    }"
                
                if [ -n "$sheet_connections" ]; then
                    sheet_connections="$sheet_connections,"
                fi
                sheet_connections="$sheet_connections
          [
            {
              \"node\": \"$node_name\",
              \"type\": \"main\",
              \"index\": 0
            }
          ]"
                
                connections="$connections,
    \"$node_name\": {
      \"main\": [
        [
          {
            \"node\": \"Respond to Webhook\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]
      ]
    }"
                
                position_y=$((position_y + 200))
            done
            
            # Add sheet switch node
            sheet_switches="$sheet_switches,
    {
      \"parameters\": {
        \"rules\": {
          \"values\": [$sheet_switch_rules]
        },
        \"options\": {}
      },
      \"type\": \"n8n-nodes-base.switch\",
      \"typeVersion\": 3.2,
      \"position\": [420, $((doc_index * 200))],
      \"id\": \"$sheet_switch_id\",
      \"name\": \"Sheet Switch - $doc\"
    }"
            
            connections="$connections,
    \"Sheet Switch - $doc\": {
      \"main\": [$sheet_connections]
    }"
            
            # Add Doc Switch connection for this document
            if [ -n "$doc_switch_connections" ]; then
                doc_switch_connections="$doc_switch_connections,"
            fi
            doc_switch_connections="$doc_switch_connections
        [
          {
            \"node\": \"Sheet Switch - $doc\",
            \"type\": \"main\",
            \"index\": 0
          }
        ]"
            
            doc_index=$((doc_index + 1))
        fi
    done < <(parse_docs_config)
    
    # Add doc switch node
    cat >> "$temp_file" << EOF
,
    {
      "parameters": {
        "rules": {
          "values": [$doc_switch_rules]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.2,
      "position": [220, 0],
      "id": "$doc_switch_id",
      "name": "Doc Switch"
    }$sheet_switches$append_nodes
  ],
  "pinData": {},
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Code1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }$connections,
    "Doc Switch": {
      "main": [$doc_switch_connections]
    },
    "Code1": {
      "main": [
        [
          {
            "node": "Doc Switch",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner"
  },
  "versionId": "$(generate_id)",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "$(generate_id)"
  },
  "id": "$(generate_id)",
  "tags": []
}
EOF

    # Copy to final location
    cp "$temp_file" "$OUTPUT_DIR/${template_name}.json"
    rm "$temp_file"
    
    print_status "Update template generated: $OUTPUT_DIR/${template_name}.json"
}

# Main execution
main() {
    print_status "Starting n8n template generation..."
    
    # Generate all templates
    generate_fetch_template
    generate_update_template
    generate_delete_template
    
    print_status "Template generation completed!"
    print_status "Generated files:"
    echo "  - $OUTPUT_DIR/${REACT_APP_N8N_FETCH_WEBHOOK:-Fetch-Rows-Multi}.json"
    echo "  - $OUTPUT_DIR/${REACT_APP_N8N_UPDATE_WEBHOOK:-Update-Rows-Multi}.json"
    echo "  - $OUTPUT_DIR/${REACT_APP_N8N_DELETE_WEBHOOK:-Delete-Row}.json"
    echo ""
    print_warning "Note: You'll need to update the document IDs in the generated templates with your actual Google Sheets document IDs."
}

# Run main function
main "$@" 