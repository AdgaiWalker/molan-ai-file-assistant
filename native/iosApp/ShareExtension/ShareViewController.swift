import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private let statusLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        statusLabel.text = "正在交给墨览…"
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)
        NSLayoutConstraint.activate([
            statusLabel.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
            statusLabel.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
            statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        receiveFirstFile()
    }

    private func receiveFirstFile() {
        guard let provider = extensionContext?.inputItems
            .compactMap({ $0 as? NSExtensionItem })
            .compactMap(\.attachments)
            .flatMap({ $0 })
            .first,
              let typeIdentifier = preferredTypeIdentifier(from: provider) else {
            finish(message: "没有可交接的文件", error: true)
            return
        }
        let originalName = provider.suggestedName
        provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { [weak self] url, error in
            guard let self else { return }
            guard let url, error == nil else {
                Task { @MainActor in self.finish(message: "无法读取分享文件", error: true) }
                return
            }
            do {
                try AppGroupInbox.enqueue(
                    fileAt: url,
                    originalName: originalName ?? url.lastPathComponent,
                    typeIdentifier: typeIdentifier
                )
                Task { @MainActor in self.finishSuccess() }
            } catch {
                Task { @MainActor in self.finish(message: "交接失败，请稍后重试", error: true) }
            }
        }
    }

    private func preferredTypeIdentifier(from provider: NSItemProvider) -> String? {
        let preferred = [UTType.json.identifier, UTType.plainText.identifier]
        return preferred.first(where: provider.hasItemConformingToTypeIdentifier)
            ?? provider.registeredTypeIdentifiers.first
    }

    private func finish(message: String, error: Bool) {
        statusLabel.text = message
        statusLabel.textColor = error ? .systemRed : .label
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func finishSuccess() {
        statusLabel.text = "已交给墨览"
        extensionContext?.open(AppGroupInbox.openURL, completionHandler: nil)
        extensionContext?.completeRequest(returningItems: nil)
    }
}
