import unittest

from scripts.download_pandoc import resolve_release


class ResolveReleaseTest(unittest.TestCase):
    def test_resolves_macos_arm64_archive_and_binary(self):
        release = resolve_release("3.10", "Darwin", "arm64")

        self.assertEqual(release.filename, "pandoc-3.10-arm64-macOS.zip")
        self.assertEqual(release.binary_name, "pandoc")
        self.assertEqual(
            release.sha256,
            "d9cad01d96ae774a0dc8c8c45bb1ad3e4c5ff2cc2e24f45958f5f9b7974aee34",
        )

    def test_resolves_windows_x64_archive_and_binary(self):
        release = resolve_release("3.10", "Windows", "AMD64")

        self.assertEqual(release.filename, "pandoc-3.10-windows-x86_64.zip")
        self.assertEqual(release.binary_name, "pandoc.exe")
        self.assertEqual(
            release.sha256,
            "bb808d00fd58762299d64582a9b4c3e4b106cd929e62c5f19bcdcb496f1e54ae",
        )

    def test_rejects_unsupported_platform(self):
        with self.assertRaisesRegex(ValueError, "不支持的平台"):
            resolve_release("3.10", "Linux", "x86_64")


if __name__ == "__main__":
    unittest.main()
