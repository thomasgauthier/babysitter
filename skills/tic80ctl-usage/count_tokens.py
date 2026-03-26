# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "tiktoken",
# ]
# ///

import argparse
import sys
from pathlib import Path

import tiktoken


def main():
    parser = argparse.ArgumentParser(
        description="Count tokens in a directory to optimize LLM context usage."
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default=".",
        help="Directory to scan (defaults to current directory)",
    )
    args = parser.parse_args()

    target_dir = Path(args.directory)

    if not target_dir.is_dir():
        print(f"Error: Directory '{target_dir}' does not exist.")
        sys.exit(1)

    enc = tiktoken.get_encoding("cl100k_base")
    total_tokens = 0
    file_stats = []
    target_extensions = {".md", ".txt", ".lua", ".yaml", ".yml", ".json"}

    for filepath in target_dir.rglob("*"):
        if filepath.is_file() and filepath.suffix.lower() in target_extensions:
            try:
                content = filepath.read_text(encoding="utf-8")
                token_count = len(enc.encode(content))
                total_tokens += token_count
                file_stats.append((str(filepath.relative_to(target_dir)), token_count))
            except UnicodeDecodeError:
                print(f"Skipping {filepath.name} (not valid UTF-8)")
            except Exception as e:
                print(f"Error reading {filepath.name}: {e}")

    file_stats.sort(key=lambda x: x[1], reverse=True)

    print(f"\nToken Count Report for: {target_dir.absolute()}")
    print("-" * 60)
    for name, count in file_stats:
        print(f"{count:7,d} tokens | {name}")
    print("-" * 60)
    print(f"{total_tokens:7,d} tokens | GRAND TOTAL\n")


if __name__ == "__main__":
    main()
