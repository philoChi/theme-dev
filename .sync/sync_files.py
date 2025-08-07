#!/usr/bin/env python3
"""
File synchronization tool that copies specific file types between directories.
Only synchronizes directories that exist in both input and output paths.
Includes recursive subfolder synchronization and output extension transformation.
"""

import argparse
import json
import logging
import os
import shutil
from pathlib import Path
from typing import List, Set, Dict, Tuple


def setup_logging() -> None:
    """Configure logging with appropriate format and level."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def load_config(config_path: str) -> Tuple[List[str], str]:
    """
    Load configuration from file.
    
    Args:
        config_path: Path to the configuration JSON file
        
    Returns:
        Tuple of (list of file extensions to synchronize, output extension)
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        json.JSONDecodeError: If config file is not valid JSON
        KeyError: If required keys are missing in config
    """
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        return config['file_extensions'], config.get('output_extension', '')
    except FileNotFoundError:
        logging.error(f"Configuration file not found: {config_path}")
        raise
    except json.JSONDecodeError:
        logging.error(f"Invalid JSON in configuration file: {config_path}")
        raise
    except KeyError:
        logging.error("Missing 'file_extensions' in configuration file")
        raise


def get_directory_structure(base_path: Path) -> Dict[str, Set[str]]:
    """
    Get the directory structure including all subfolders.
    
    Args:
        base_path: Base directory path to scan
        
    Returns:
        Dictionary mapping relative paths to sets of subfolder names
    """
    structure: Dict[str, Set[str]] = {}
    
    for root, dirs, _ in os.walk(base_path):
        rel_path = os.path.relpath(root, base_path)
        if rel_path == '.':
            # Handle the root directory
            structure[''] = {d for d in dirs}
        else:
            # Handle subdirectories
            structure[rel_path] = {d for d in dirs}
            
    return structure


def get_common_directory_structure(
    input_path: Path,
    output_path: Path
) -> Dict[str, Set[str]]:
    """
    Find directories and subfolders that exist in both input and output paths.
    
    Args:
        input_path: Base input directory path
        output_path: Base output directory path
        
    Returns:
        Dictionary mapping relative paths to sets of common subfolder names
    """
    input_structure = get_directory_structure(input_path)
    output_structure = get_directory_structure(output_path)
    
    common_structure: Dict[str, Set[str]] = {}
    
    # Process all paths in input structure
    for rel_path in input_structure:
        if rel_path in output_structure:
            # Find common subdirectories at this level
            common_dirs = input_structure[rel_path].intersection(
                output_structure[rel_path]
            )
            if common_dirs:
                common_structure[rel_path] = common_dirs
                
    return common_structure


def copy_file_content(source_file: Path, dest_file: Path) -> None:
    """
    Copy content from source file to destination file only if content differs.
    
    Args:
        source_file: Source file path
        dest_file: Destination file path
    """
    try:
        # Read source file content
        with open(source_file, 'rb') as src:
            source_content = src.read()
            
        # Read destination file content
        with open(dest_file, 'rb') as dst:
            dest_content = dst.read()
            
        # Only update if content differs
        if source_content != dest_content:
            with open(dest_file, 'wb') as dst:
                dst.write(source_content)
            logging.info(f"Updated content: {dest_file} from {source_file}")
        else:
            logging.debug(f"Skipped update of {dest_file} (content identical)")
            
    except Exception as e:
        logging.error(f"Error copying content from {source_file} to {dest_file}: {e}")
        raise


def clean_directory_smart(directory: Path, reference_dir: Path, extensions: List[str]) -> None:
    """
    Remove files in the destination directory that don't exist in the source directory.
    
    Args:
        directory: Directory to clean (destination)
        reference_dir: Reference directory to check against (source)
        extensions: List of file extensions to consider
    """
    for item in directory.iterdir():
        if item.is_file() and any(item.name.endswith(ext) for ext in extensions):
            # Check if corresponding file exists in reference directory
            ref_file = reference_dir / item.name
            if not ref_file.exists():
                item.unlink()
                logging.info(f"Deleted: {item} (not present in source)")


def get_output_filename(filename: str, output_extension: str) -> str:
    """
    Transform input filename to output filename based on output extension.
    
    Args:
        filename: Original filename
        output_extension: Optional extension to append (without dot)
        
    Returns:
        Transformed filename
    """
    if output_extension:
        return f"{filename}.{output_extension}"
    return filename


def sync_directory(
    input_dir: Path,
    output_dir: Path,
    extensions: List[str],
    output_extension: str
) -> None:
    """
    Synchronize files with specified extensions from input to output directory.
    Only delete files that don't exist in source, and update existing files by content.
    
    Args:
        input_dir: Source directory path
        output_dir: Destination directory path
        extensions: List of file extensions to synchronize
        output_extension: Optional extension to append to output files
    """
    # First, remove files in output that don't exist in input
    clean_directory_smart(output_dir, input_dir, extensions)
    
    # Process each file in input directory
    for file in input_dir.iterdir():
        if file.is_file() and any(file.name.endswith(ext) for ext in extensions):
            output_filename = get_output_filename(file.name, output_extension)
            output_path = output_dir / output_filename
            
            if output_path.exists():
                # If file exists in both places, copy content instead of replacing
                copy_file_content(file, output_path)
            else:
                # If file only exists in source, copy it
                shutil.copy2(file, output_path)
                logging.info(f"Copied new file: {file} -> {output_path}")


def sync_directories_recursive(
    input_base: Path,
    output_base: Path,
    common_structure: Dict[str, Set[str]],
    extensions: List[str],
    output_extension: str
) -> None:
    """
    Recursively synchronize directories and their subdirectories.
    
    Args:
        input_base: Base input directory path
        output_base: Base output directory path
        common_structure: Dictionary of common directories and their subdirectories
        extensions: List of file extensions to synchronize
        output_extension: Optional extension to append to output files
    """
    # Process root level first if present
    if '' in common_structure:
        for dir_name in common_structure['']:
            input_dir = input_base / dir_name
            output_dir = output_base / dir_name
            logging.info(f"Syncing directory: {dir_name}")
            sync_directory(input_dir, output_dir, extensions, output_extension)
    
    # Process all other paths
    for rel_path, subdirs in common_structure.items():
        if rel_path == '':
            continue
            
        # Create Path objects for the current level
        current_input = input_base / rel_path
        current_output = output_base / rel_path
        
        # Sync current directory
        logging.info(f"Syncing directory: {rel_path}")
        sync_directory(current_input, current_output, extensions, output_extension)
        
        # Process subdirectories at this level
        for subdir in subdirs:
            input_subdir = current_input / subdir
            output_subdir = current_output / subdir
            if input_subdir.exists() and output_subdir.exists():
                logging.info(f"Syncing subdirectory: {rel_path}/{subdir}")
                sync_directory(input_subdir, output_subdir, extensions, output_extension)


def main(input_path: str, output_path: str, config_path: str) -> None:
    """
    Main function to handle directory synchronization.
    
    Args:
        input_path: Path to source directory
        output_path: Path to destination directory
        config_path: Path to configuration file
    """
    setup_logging()
    
    # Convert to Path objects
    input_base = Path(input_path)
    output_base = Path(output_path)
    
    # Validate paths
    if not input_base.exists():
        raise FileNotFoundError(f"Input path does not exist: {input_path}")
    if not output_base.exists():
        raise FileNotFoundError(f"Output path does not exist: {output_path}")
    
    # Load configuration
    extensions, output_extension = load_config(config_path)
    logging.info(f"Loaded extensions to sync: {extensions}")
    if output_extension:
        logging.info(f"Output files will have .{output_extension} extension appended")
    
    # Find common directory structure
    common_structure = get_common_directory_structure(input_base, output_base)
    logging.info(f"Found common directory structure: {common_structure}")
    
    # Sync all directories recursively
    sync_directories_recursive(
        input_base,
        output_base,
        common_structure,
        extensions,
        output_extension
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Synchronize specific file types between directories"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to the input directory"
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to the output directory"
    )
    parser.add_argument(
        "--config",
        required=True,
        help="Path to configuration file"
    )
    
    args = parser.parse_args()
    
    try:
        main(args.input, args.output, args.config)
        logging.info("Synchronization completed successfully")
    except Exception as e:
        logging.error(f"Error during synchronization: {e}")
        raise