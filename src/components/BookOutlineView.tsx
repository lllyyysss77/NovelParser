import type { BookOutline } from '../types';

interface BookOutlineViewProps {
    outline: BookOutline;
}

export default function BookOutlineView({ outline }: BookOutlineViewProps) {
    return (
        <div className="space-y-6">
            <div className="card bg-base-200 border border-base-300">
                <div className="card-body p-5">
                    <h3 className="font-bold text-lg mb-2">整体概览</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{outline.overview}</p>
                </div>
            </div>

            {outline.stage_outlines.length > 0 && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-5">
                        <h3 className="font-bold text-lg mb-3">阶段大纲</h3>
                        <div className="space-y-3">
                            {outline.stage_outlines.map((segment, index) => (
                                <div key={`${segment.title}-${index}`} className="rounded-xl bg-base-300/40 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-semibold">{segment.title}</div>
                                        <div className="badge badge-outline">
                                            第 {segment.chapter_start + 1}-{segment.chapter_end + 1} 章
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{segment.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {outline.main_plot_threads.length > 0 && (
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-5">
                            <h3 className="font-bold text-lg mb-3">主线推进</h3>
                            <div className="space-y-2">
                                {outline.main_plot_threads.map((item, index) => (
                                    <div key={index} className="rounded-lg bg-base-300/40 px-3 py-2 text-sm">{item}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {outline.major_conflicts.length > 0 && (
                    <div className="card bg-base-200 border border-base-300">
                        <div className="card-body p-5">
                            <h3 className="font-bold text-lg mb-3">主要冲突</h3>
                            <div className="space-y-2">
                                {outline.major_conflicts.map((item, index) => (
                                    <div key={index} className="rounded-lg bg-base-300/40 px-3 py-2 text-sm">{item}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {outline.key_character_arcs.length > 0 && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-5">
                        <h3 className="font-bold text-lg mb-3">人物线</h3>
                        <div className="space-y-3">
                            {outline.key_character_arcs.map((arc, index) => (
                                <div key={`${arc.name}-${index}`} className="rounded-xl bg-base-300/40 p-4">
                                    <div className="font-semibold text-primary">{arc.name}</div>
                                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{arc.arc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {outline.setup_payoff_map.length > 0 && (
                <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-5">
                        <h3 className="font-bold text-lg mb-3">伏笔与回收</h3>
                        <div className="space-y-3">
                            {outline.setup_payoff_map.map((item, index) => (
                                <div key={index} className="rounded-xl bg-base-300/40 p-4 text-sm">
                                    <div><span className="font-semibold">铺垫：</span>{item.setup}</div>
                                    {item.payoff && <div className="mt-1"><span className="font-semibold">回收：</span>{item.payoff}</div>}
                                    {item.chapter_ref && <div className="mt-1 text-xs text-base-content/60">{item.chapter_ref}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
