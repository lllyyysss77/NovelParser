import type { ChapterOutline } from '../types';

interface ChapterOutlineViewProps {
    outline: ChapterOutline;
    chapterTitle: string;
}

export default function ChapterOutlineView({ outline, chapterTitle }: ChapterOutlineViewProps) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">{chapterTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{outline.brief}</p>
            </div>

            {outline.chapter_goal && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-4">
                        <h3 className="font-semibold mb-2">本章目标</h3>
                        <p className="text-sm leading-relaxed">{outline.chapter_goal}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {outline.core_events.length > 0 && (
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4">
                            <h3 className="font-semibold mb-2">关键推进</h3>
                            <div className="space-y-2">
                                {outline.core_events.map((item, index) => (
                                    <div key={index} className="rounded-lg bg-base-300/40 px-3 py-2 text-sm">{item}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {outline.status_changes.length > 0 && (
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-4">
                            <h3 className="font-semibold mb-2">状态变化</h3>
                            <div className="space-y-2">
                                {outline.status_changes.map((item, index) => (
                                    <div key={index} className="rounded-lg bg-base-300/40 px-3 py-2 text-sm">{item}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {outline.new_characters.length > 0 && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-4">
                        <h3 className="font-semibold mb-2">新角色</h3>
                        <div className="flex flex-wrap gap-2">
                            {outline.new_characters.map((name, index) => (
                                <span key={index} className="badge badge-outline">{name}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {outline.hook && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-4">
                        <h3 className="font-semibold mb-2">章末钩子</h3>
                        <p className="text-sm leading-relaxed">{outline.hook}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
