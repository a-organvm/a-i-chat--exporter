import JSZip from 'jszip'
import i18n from '../i18n'
import { checkIfConversationStarted } from '../page'
import { getActiveProvider } from '../providers'
import { convertToOoba, convertToTavern } from '../utils/conversion'
import { downloadFile, getFileNameWithFormat } from '../utils/download'
import type { ApiConversationWithId } from '../providers'

export async function exportToJson(fileNameFormat: string) {
    if (!checkIfConversationStarted()) {
        alert(i18n.t('Please start a conversation first'))
        return false
    }

    const provider = getActiveProvider()
    const chatId = await provider.getCurrentChatId()
    const rawConversation = await provider.fetchConversation(chatId, false)
    const conversation = provider.processConversation(rawConversation)

    const fileName = getFileNameWithFormat(fileNameFormat, 'json', { title: conversation.title, chatId })
    /**
     * The official format is just an array of the API response.
     */
    const content = conversationToJson([rawConversation])
    downloadFile(fileName, 'application/json', content)

    return true
}

export async function exportToTavern(fileNameFormat: string) {
    if (!checkIfConversationStarted()) {
        alert(i18n.t('Please start a conversation first'))
        return false
    }

    const provider = getActiveProvider()
    const chatId = await provider.getCurrentChatId()
    const rawConversation = await provider.fetchConversation(chatId, false)
    const conversation = provider.processConversation(rawConversation)

    const fileName = getFileNameWithFormat(`${fileNameFormat}.tavern`, 'jsonl', { title: conversation.title, chatId })
    const content = convertToTavern(conversation)
    downloadFile(fileName, 'application/json-lines', content)

    return true
}

export async function exportToOoba(fileNameFormat: string) {
    if (!checkIfConversationStarted()) {
        alert(i18n.t('Please start a conversation first'))
        return false
    }

    const provider = getActiveProvider()
    const chatId = await provider.getCurrentChatId()
    const rawConversation = await provider.fetchConversation(chatId, false)
    const conversation = provider.processConversation(rawConversation)

    const fileName = getFileNameWithFormat(`${fileNameFormat}.ooba`, 'json', { title: conversation.title, chatId })
    const content = convertToOoba(conversation)
    downloadFile(fileName, 'application/json', content)

    return true
}

export async function exportAllToOfficialJson(_fileNameFormat: string, apiConversations: ApiConversationWithId[]) {
    const content = conversationToJson(apiConversations)
    downloadFile('chatgpt-export.json', 'application/json', content)

    return true
}

export async function exportAllToJson(fileNameFormat: string, apiConversations: ApiConversationWithId[]) {
    const provider = getActiveProvider()
    const zip = new JSZip()
    const filenameMap = new Map<string, number>()
    const conversations = apiConversations.map(x => ({
        conversation: provider.processConversation(x),
        rawConversation: x,
    }))
    conversations.forEach(({ conversation, rawConversation }) => {
        let fileName = getFileNameWithFormat(fileNameFormat, 'json', {
            title: conversation.title,
            chatId: conversation.id,
            createTime: conversation.createTime,
            updateTime: conversation.updateTime,
        })
        if (filenameMap.has(fileName)) {
            const count = filenameMap.get(fileName) ?? 1
            filenameMap.set(fileName, count + 1)
            fileName = `${fileName.slice(0, -5)} (${count}).json`
        }
        else {
            filenameMap.set(fileName, 1)
        }
        const content = conversationToJson(rawConversation)
        zip.file(fileName, content)
    })

    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9,
        },
    })
    downloadFile('chatgpt-export-json.zip', 'application/zip', blob)

    return true
}

function conversationToJson(conversation: ApiConversationWithId | ApiConversationWithId[]) {
    return JSON.stringify(conversation)
}
