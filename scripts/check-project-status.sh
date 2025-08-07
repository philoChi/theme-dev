#!/bin/bash

# Project Status Checker Script - Working Version
# Analyzes planning documents to identify completion status

# Simple version without complex loops
PLANNING_DIR="planning"

# Flags
SHOW_ALL=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all) SHOW_ALL=true; shift ;;
        -v|--verbose) VERBOSE=true; shift ;;
        -h|--help) 
            echo "Usage: $0 [OPTIONS]"
            echo "  -a, --all      Show all projects including completed"
            echo "  -v, --verbose  Show detailed information"
            echo "  -h, --help     Show this help"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "=== Project Status Analysis ==="
echo ""

total_projects=0
complete_projects=0
incomplete_projects=0

# Function to count checkboxes in a file
count_checkboxes() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "0 0"
        return
    fi
    
    local completed=0
    local total=0
    
    while read -r line; do
        if [[ $line =~ ^[[:space:]]*[-|]*[[:space:]]*\[[xX]\] ]]; then
            ((completed++))
            ((total++))
        elif [[ $line =~ ^[[:space:]]*[-|]*[[:space:]]*\[[[:space:]]\] ]]; then
            ((total++))
        fi
    done < "$file"
    
    echo "$completed $total"
}

# Check each project
for project_path in "$PLANNING_DIR"/*; do
    if [[ ! -d "$project_path" ]] || [[ $(basename "$project_path") == "Change-Requests" ]]; then
        continue
    fi
    
    ((total_projects++))
    project_name=$(basename "$project_path")
    
    # Remove (complete) suffix if present
    display_name="$project_name"
    is_marked_complete=false
    if [[ $project_name =~ \(complete\)$ ]]; then
        is_marked_complete=true
        display_name="${project_name% (complete)}"
    fi
    
    # Check implementation checklist
    checklist="$project_path/Checklists/implementation-checklist.md"
    if [[ -f "$checklist" ]]; then
        read completed total <<< "$(count_checkboxes "$checklist")"
        
        if [[ $is_marked_complete == true ]]; then
            status="complete (marked)"
            ((complete_projects++))
        elif [[ $total -eq 0 ]]; then
            status="unknown"
            ((incomplete_projects++))
        elif [[ $completed -eq 0 ]]; then
            status="not_started"
            ((incomplete_projects++))
        elif [[ $completed -eq $total ]]; then
            status="complete"
            ((complete_projects++))
        else
            status="in_progress"
            ((incomplete_projects++))
        fi
        
        percentage="N/A"
        if [[ $total -gt 0 ]]; then
            percentage="$((completed * 100 / total))%"
        fi
        
        # Show project if not complete or if showing all
        if [[ $SHOW_ALL == true ]] || [[ ! $status =~ complete ]]; then
            echo "🚀 Project: $display_name"
            echo "   Status: $status ($completed/$total checkpoints - $percentage)"
            
            if [[ $VERBOSE == true ]]; then
                echo "   Checklist: $checklist"
            fi
            echo ""
        fi
        
        # Check for change requests in this project
        change_req_dir="$project_path/Change-Requests"
        if [[ -d "$change_req_dir" ]]; then
            for cr_path in "$change_req_dir"/*; do
                if [[ ! -d "$cr_path" ]]; then
                    continue
                fi
                
                ((total_projects++))
                cr_name=$(basename "$cr_path")
                cr_plan="$cr_path/plan/ChangeRequestPlan.md"
                
                if [[ -f "$cr_plan" ]]; then
                    # For change requests, we need to look in specific sections
                    cr_completed=0
                    cr_total=0
                    in_checklist=false
                    
                    while read -r line; do
                        if [[ $line =~ ^##[[:space:]]*(Implementation[[:space:]]+Checklist|Testing[[:space:]]+Criteria[[:space:]]+Checklist) ]]; then
                            in_checklist=true
                        elif [[ $line =~ ^##[[:space:]] ]] && [[ $in_checklist == true ]]; then
                            if [[ ! $line =~ ^##[[:space:]]*(Implementation[[:space:]]+Checklist|Testing[[:space:]]+Criteria[[:space:]]+Checklist) ]]; then
                                in_checklist=false
                            fi
                        fi
                        
                        if [[ $in_checklist == true ]]; then
                            if [[ $line =~ ^[[:space:]]*[-|]*[[:space:]]*\[[xX]\] ]]; then
                                ((cr_completed++))
                                ((cr_total++))
                            elif [[ $line =~ ^[[:space:]]*[-|]*[[:space:]]*\[[[:space:]]\] ]]; then
                                ((cr_total++))
                            fi
                        fi
                    done < "$cr_plan"
                    
                    if [[ $cr_total -eq 0 ]]; then
                        cr_status="unknown"
                        ((incomplete_projects++))
                    elif [[ $cr_completed -eq 0 ]]; then
                        cr_status="not_started"
                        ((incomplete_projects++))
                    elif [[ $cr_completed -eq $cr_total ]]; then
                        cr_status="complete"
                        ((complete_projects++))
                    else
                        cr_status="in_progress"
                        ((incomplete_projects++))
                    fi
                    
                    cr_percentage="N/A"
                    if [[ $cr_total -gt 0 ]]; then
                        cr_percentage="$((cr_completed * 100 / cr_total))%"
                    fi
                    
                    if [[ $SHOW_ALL == true ]] || [[ $cr_status != "complete" ]]; then
                        echo "  └── 📋 Change-Request: $cr_name"
                        echo "      Status: $cr_status ($cr_completed/$cr_total checkpoints - $cr_percentage)"
                        
                        if [[ $VERBOSE == true ]]; then
                            echo "      Plan: $cr_plan"
                        fi
                        echo ""
                    fi
                else
                    ((incomplete_projects++))
                    if [[ $SHOW_ALL == true ]] || true; then
                        echo "  └── 📋 Change-Request: $cr_name"
                        echo "      Status: no_plan (ChangeRequestPlan.md missing)"
                        echo ""
                    fi
                fi
            done
        fi
    else
        ((incomplete_projects++))
        if [[ $SHOW_ALL == true ]] || true; then
            echo "🚀 Project: $display_name"
            echo "   Status: no_checklist (implementation-checklist.md missing)"
            echo ""
        fi
    fi
done

# Summary
echo "=== Summary ==="
echo "Total projects/change-requests: $total_projects"
echo "Complete: $complete_projects"
echo "Incomplete: $incomplete_projects"

if [[ $SHOW_ALL == false ]] && [[ $incomplete_projects -eq 0 ]]; then
    echo ""
    echo "🎉 All projects are complete! Use -a flag to see all projects."
fi