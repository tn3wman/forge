use git2::{Oid, Repository, Sort};

use crate::models::git::{CommitInfo, GraphLine, GraphRow};

const NUM_COLORS: usize = 8;

fn commit_to_info(commit: &git2::Commit) -> CommitInfo {
    let oid = commit.id().to_string();
    let short_id = oid[..7.min(oid.len())].to_string();
    let author = commit.author();

    CommitInfo {
        oid,
        short_id,
        message: commit.message().unwrap_or("").to_string(),
        author: author.name().unwrap_or("").to_string(),
        author_email: author.email().unwrap_or("").to_string(),
        timestamp: commit.time().seconds(),
        parents: commit.parent_ids().map(|id| id.to_string()).collect(),
    }
}

pub fn get_log(
    path: &str,
    skip: usize,
    limit: usize,
    branch: Option<&str>,
) -> Result<Vec<GraphRow>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to create revwalk: {e}"))?;

    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| format!("Failed to set sorting: {e}"))?;

    if let Some(branch_name) = branch {
        let reference = repo
            .resolve_reference_from_short_name(branch_name)
            .map_err(|e| format!("Failed to resolve branch '{branch_name}': {e}"))?;
        let oid = reference
            .target()
            .ok_or_else(|| format!("Branch '{branch_name}' has no target"))?;
        revwalk.push(oid).map_err(|e| format!("Failed to push oid: {e}"))?;
    } else {
        revwalk.push_head().map_err(|e| format!("Failed to push HEAD: {e}"))?;
    }

    let mut active_lanes: Vec<Option<Oid>> = Vec::new();
    let mut rows = Vec::new();
    let mut count = 0;

    for oid_result in revwalk {
        let oid = oid_result.map_err(|e| format!("Revwalk error: {e}"))?;

        if count < skip {
            count += 1;
            continue;
        }
        if rows.len() >= limit {
            break;
        }
        count += 1;

        let commit = repo
            .find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {e}"))?;

        let info = commit_to_info(&commit);

        // Find the lane for this commit
        let column = active_lanes
            .iter()
            .position(|lane| *lane == Some(oid))
            .unwrap_or_else(|| {
                // Assign a new lane
                let idx = active_lanes.len();
                active_lanes.push(Some(oid));
                idx
            });

        let mut graph_lines = Vec::new();
        let parent_ids: Vec<Oid> = commit.parent_ids().collect();

        if parent_ids.is_empty() {
            // Root commit: close the lane
            active_lanes[column] = None;
        } else {
            // First parent takes over this lane
            let first_parent = parent_ids[0];
            active_lanes[column] = Some(first_parent);

            // Draw line from commit's column to itself (continuation)
            graph_lines.push(GraphLine {
                from_column: column,
                to_column: column,
                color_index: column % NUM_COLORS,
            });

            // Additional parents: fork or merge
            for &parent_id in &parent_ids[1..] {
                // Check if parent already has a lane (merge)
                if let Some(existing) = active_lanes.iter().position(|lane| *lane == Some(parent_id)) {
                    graph_lines.push(GraphLine {
                        from_column: column,
                        to_column: existing,
                        color_index: existing % NUM_COLORS,
                    });
                } else {
                    // Fork: assign new lane for additional parent
                    let new_lane = active_lanes.len();
                    active_lanes.push(Some(parent_id));
                    graph_lines.push(GraphLine {
                        from_column: column,
                        to_column: new_lane,
                        color_index: new_lane % NUM_COLORS,
                    });
                }
            }
        }

        // Draw continuation lines for other active lanes
        for (i, lane) in active_lanes.iter().enumerate() {
            if i != column && lane.is_some() {
                graph_lines.push(GraphLine {
                    from_column: i,
                    to_column: i,
                    color_index: i % NUM_COLORS,
                });
            }
        }

        // Compact: remove trailing None lanes
        while active_lanes.last() == Some(&None) {
            active_lanes.pop();
        }

        rows.push(GraphRow {
            commit: info,
            column,
            lines: graph_lines,
        });
    }

    Ok(rows)
}
