import EventEmitter from 'mitt'
import { sleep } from './utils'

type RequestFn<T> = () => Promise<T>
interface RequestObject<T> {
    name: string
    request: RequestFn<T>
}
interface ProgressEvent {
    total: number
    completed: number
    currentName: string
    currentStatus: 'processing' | 'retrying'
}

type RequestQueueEvents<T> = {
    done: T[]
    progress: ProgressEvent
}

export class RequestQueue<T> {
    private eventEmitter = EventEmitter<RequestQueueEvents<T>>()

    private queue: Array<RequestObject<T>> = []
    private results: T[] = []

    private status: 'IDLE' | 'IN_PROGRESS' | 'STOPPED' | 'COMPLETED' = 'IDLE'

    private readonly backoffMultiplier = 2
    private backoff: number

    private total = 0
    private completed = 0

    constructor(private minBackoff: number, private maxBackoff: number) {
        this.backoff = minBackoff
    }

    add(requestObject: RequestObject<T>) {
        this.queue.push(requestObject)
    }

    start() {
        if (this.status === 'IDLE') {
            this.total = this.queue.length
            this.process()
        }
    }

    stop() {
        if (this.status === 'COMPLETED' || this.status === 'STOPPED') {
            return
        }

        if (this.status === 'IDLE') {
            this.done()
            return
        }

        this.status = 'STOPPED'
    }

    clear() {
        this.queue = []
        this.results = []
        this.status = 'IDLE'
        this.backoff = this.minBackoff
        this.total = 0
        this.completed = 0
    }

    on(event: 'progress', fn: (progress: ProgressEvent) => void): () => void
    on(event: 'done', fn: (result: T[]) => void): () => void
    on<K extends keyof RequestQueueEvents<T>>(event: K, fn: (event: RequestQueueEvents<T>[K]) => void): () => void {
        this.eventEmitter.on(event, fn)
        return () => this.eventEmitter.off(event, fn)
    }

    private async process() {
        if (this.status === 'STOPPED') {
            this.done()
            return
        }
        if (this.status === 'COMPLETED') {
            return
        }

        if (this.queue.length === 0) {
            this.done()
            return
        }

        this.status = 'IN_PROGRESS'
        const requestObject = this.queue.shift()!
        const { name, request } = requestObject

        try {
            this.progress(name, 'processing')
            const result = await request()
            this.results.push(result)
            this.completed++
            this.progress(name, 'processing')
            this.backoff = this.minBackoff // reset backoff on success
        }
        catch (error) {
            console.error(`Request ${name} failed:`, error)
            if (this.status === 'STOPPED') {
                this.done()
                return
            }
            this.progress(name, 'retrying')
            this.backoff = Math.min(this.backoff * this.backoffMultiplier, this.maxBackoff)
            this.queue.unshift(requestObject) // add request back to the front of the queue
        }

        await sleep(this.backoff)
        this.process()
    }

    private progress(name: string, status: 'processing' | 'retrying') {
        this.eventEmitter.emit('progress', {
            total: this.total,
            completed: this.completed,
            currentName: name,
            currentStatus: status,
        })
    }

    private done() {
        this.status = 'COMPLETED'
        this.eventEmitter.emit('done', this.results)
    }
}
