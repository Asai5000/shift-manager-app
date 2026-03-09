'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BookOpen, CalendarDays, CalendarClock, MousePointer2, RefreshCw,
    QrCode, Lock, Printer, AlertTriangle, Users, Calculator, Settings
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ManualPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl space-y-8">
            <div className="flex items-center space-x-3 mb-6">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-slate-900 flex-1">システム操作マニュアル</h1>
                <div className="hidden sm:block text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    バージョン 2.1
                </div>
            </div>

            <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
                <CardContent className="pt-6">
                    <p className="text-slate-700 leading-relaxed font-medium">
                        当シフト管理システムは、全体のシフト管理、特定のタスク（AM/PM）の自動・手動割り当て、休日出勤の処理などを一元化するシステムです。<br />
                        このマニュアルでは、「誰でもできる操作」と「管理者のみ可能な操作」に分けて、主要機能の使い方を説明します。
                    </p>
                </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={["auth", "calendar", "schedules", "admin-adjust", "settings"]} className="w-full space-y-4">

                {/* --- 1. ログインと権限 --- */}
                <AccordionItem value="auth" className="border rounded-lg bg-white shadow-sm px-2">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center text-xl font-bold text-slate-800">
                            <Lock className="mr-3 h-6 w-6 text-blue-500" />
                            1. ログインと権限について
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 space-y-4 px-4">
                        <div className="space-y-3 text-slate-700">
                            <div>
                                <h4 className="font-bold flex items-center text-slate-800"><RefreshCw className="h-4 w-4 mr-2" /> ログイン状態の保持</h4>
                                <ul className="list-disc ml-6 mt-1 space-y-1 text-sm">
                                    <li>ログイン画面で「ログイン状態を保持する」にチェックを入れると、<strong>7日間</strong>ログアウトされません。</li>
                                    <li>チェックを入れない場合、パソコンから離れるなどで操作が<strong>30分間</strong>ないと、安全のため自動的にログアウトされます。</li>
                                </ul>
                            </div>
                            <div className="border-t border-slate-100 pt-3">
                                <h4 className="font-bold flex items-center text-slate-800"><Users className="h-4 w-4 mr-2" /> 権限の違い</h4>
                                <ul className="list-disc ml-6 mt-1 space-y-1 text-sm">
                                    <li><strong>一般従業員:</strong> メインカレンダーで自分のシフトのみ編集可能です。予定（スケジュール）の追加やAM/PMタスクの閲覧は全員可能です。</li>
                                    <li><strong>管理者:</strong> 全従業員のシフト編集、シフト調整画面の利用、システム設定（従業員追加、タスク追加など）へのアクセスが可能です。</li>
                                </ul>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- 2. メインカレンダー --- */}
                <AccordionItem value="calendar" className="border rounded-lg bg-white shadow-sm px-2">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center text-xl font-bold text-slate-800">
                            <CalendarDays className="mr-3 h-6 w-6 text-blue-500" />
                            2. メインカレンダー（全従業員用）
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 space-y-4 px-4">
                        <div className="space-y-3 text-slate-700">
                            <div>
                                <h4 className="font-bold text-slate-800">基本の見方</h4>
                                <ul className="list-disc ml-6 mt-1 space-y-1 text-sm">
                                    <li><strong>自分のシフト:</strong> 自分の名前の行は青い太枠でハイライトされ、常に表の一番上に表示されます。</li>
                                    <li><strong>色の意味:</strong><br />
                                        <span className="inline-block w-3 h-3 bg-slate-200 rounded-full mr-1 ml-4 mt-1"></span>「休(午前)」「希望休」など休み系はグレー表示。<br />
                                        <span className="inline-block w-3 h-3 bg-red-100 border border-red-500 rounded-full mr-1 ml-4 mt-1"></span>「出張」「特別休暇」「休日出勤」は赤色で強調表示されます。
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">シフト・予定の編集と印刷</h4>
                                <ul className="list-disc ml-6 mt-1 space-y-1 text-sm">
                                    <li><strong>自分のシフト登録:</strong> 自分の行の日付セルをクリックすると、シフトを入力・変更できます。</li>
                                    <li><strong>予定（スケジュール）の登録:</strong> カレンダー上部の日付部分をクリックすると、その日に行われる会議などの「予定」を誰でも登録できます。</li>
                                    <li><Printer className="inline h-4 w-4 mr-1 text-slate-500" /><strong>印刷:</strong> 右上の「印刷」ボタンを押すと、カレンダーが<strong>A3縦サイズ</strong>で綺麗に印刷できるレイアウトに切り替わります（同時にQRコードも印字されます）。</li>
                                </ul>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- 3. AM/PMスケジュール管理 --- */}
                <AccordionItem value="schedules" className="border rounded-lg bg-white shadow-sm px-2">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center text-xl font-bold text-slate-800">
                            <RefreshCw className="mr-3 h-6 w-6 text-blue-500" />
                            3. AM / PMタスク管理・予定管理
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 space-y-4 px-4">
                        <div className="space-y-4 text-slate-700">
                            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-lg">
                                <h4 className="font-bold text-blue-800 mb-2">シフト入力とAM/PMタスクの「自動同期」</h4>
                                <p className="text-sm mb-2">メインカレンダーやシフト調整画面で特定のシフトを入力すると、AM（午前）・PM（午後）のタスク表に自動的に「休み」等が反映されます。</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    <div className="bg-white p-3 rounded shadow-sm">
                                        <p className="font-bold text-xs text-blue-600 mb-1">AMタスクに自動反映されるシフト</p>
                                        <p className="text-xs text-slate-600">休日(1日/午前), 希望休(1日/午前), 出張(1日/午前), 特別休暇</p>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow-sm">
                                        <p className="font-bold text-xs text-indigo-600 mb-1">PMタスクに自動反映されるシフト</p>
                                        <p className="text-xs text-slate-600">休日(1日/午後), 希望休(1日/午後), 出張(1日/午後), 特別休暇</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-1">AMタスク / PMタスク 手動編集</h4>
                                <ul className="list-disc ml-6 space-y-1 text-sm">
                                    <li>自動同期された「特休」や「出張」以外にも、ドロップダウンから自由にタスク（業務内容）を割り当てることができます。</li>
                                    <li>「自由入力」ボタンを押すと、リストにない独自のタスク名を直接キーボードで入力できます。</li>
                                    <li>管理者は「自動割り当て」機能を使って、ランダムにタスクを均等自動配置することが可能です（※「自動割り当てから除外」設定されているタスクを除く）。</li>
                                    <li>一度手動で編集したり、自動割り当てを実行した場合は、クリアボタンでリセットが可能です。</li>
                                </ul>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <h4 className="font-bold text-slate-800 mb-1 flex items-center"><CalendarClock className="h-4 w-4 mr-2" /> 繰り返し予定の設定</h4>
                                <p className="text-sm mb-1 ml-6">「予定管理」＞「繰り返し予定(月間)」から、毎月決まった日に入る予定を設定できます。</p>
                                <ul className="list-disc ml-12 space-y-1 text-sm text-slate-600">
                                    <li>例：「第1 月曜日 定例会議」のように設定します。</li>
                                    <li><strong>略称設定:</strong> タイトルが長い場合、カレンダー上に表示される短い名前（例:「会議」）を設定できます。略称を消去して空欄で保存すると、元のタイトルが表示されるようになります。</li>
                                </ul>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- 4. シフト調整・集計 (管理者) --- */}
                <AccordionItem value="admin-adjust" className="border rounded-lg bg-white shadow-sm px-2">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center text-xl font-bold text-slate-800">
                            <MousePointer2 className="mr-3 h-6 w-6 text-red-500" />
                            4. シフト調整・集計（要 管理者権限）
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 space-y-4 px-4">
                        <div className="space-y-4 text-slate-700">
                            <p className="text-sm text-slate-600 -mt-2">「予定管理」メニュー内にある、管理者のための高度な調整ツール群です。</p>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-1 border-l-4 border-blue-500 pl-2">月間最終チェック（シフトドラッグ調整）</h4>
                                <ul className="list-disc ml-6 space-y-1 text-sm mb-3">
                                    <li><strong>ドラッグ＆ドロップ（PC専用）:</strong> シフトをマウスで掴んで、別の日付へスライドして移動させることができます。画面端に持っていくと自動でカレンダーがスクロールします。</li>
                                    <li><strong>休日数の内訳:</strong> カレンダー日付の横に表示される <code>2(1/1)</code> のような数字は、<strong>「合計休み人数(薬剤師休み/助手休み)」</strong> を表しています。人数不足の日が一目でわかります。</li>
                                </ul>
                                <div className="bg-yellow-50 p-3 mt-2 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start">
                                    <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                                    <div>
                                        <strong>AMタスク重複アラート:</strong> シフトを「休み系」に変更しようとした際、その日の午前に既に「○○業務」とタスクが割り当てられている場合、警告画面が出ます。「タスクを上書きして休みにする」か「変更をやめる」かを選べます。
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-1 border-l-4 border-green-500 pl-2">休日出勤の自動割り振り機能</h4>
                                <p className="text-sm ml-2 mb-1">特定期間内の「日曜日・祝日」に対して、従業員をランダムかつ均等に休日出勤として割り当てる機能です。</p>
                                <ul className="list-disc ml-6 space-y-1 text-sm">
                                    <li>条件（割り振り人数、割合ベースか回数ベースか）を設定してプレビューを生成します。</li>
                                    <li>プレビュー画面で一時的に手動で微調整が可能です。</li>
                                    <li>結果に問題がなければ「本番環境（シフト表）に反映する」を押すことで、実際のカレンダーへ「休日出勤」として登録されます。不要になったら「割り振りを取り消す」ことで一括削除も可能です。</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-1 border-l-4 border-purple-500 pl-2"><Calculator className="h-4 w-4 inline mr-1 -mt-0.5" />シフト集計画面</h4>
                                <p className="text-sm ml-2">月別の各自の「休日取得日数（公休、希望休、有休など）」を瞬時に計算し、リスト形式で確認・印刷できる画面です。</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- 5. 各種設定 --- */}
                <AccordionItem value="settings" className="border rounded-lg bg-white shadow-sm px-2">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center text-xl font-bold text-slate-800">
                            <Settings className="mr-3 h-6 w-6 text-slate-500" />
                            5. システムとアカウントの設定
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 space-y-4 px-4">
                        <div className="space-y-4 text-slate-700">

                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                                <h4 className="font-bold text-slate-800 mb-2">共通の操作（全従業員）</h4>
                                <div className="flex items-start">
                                    <Lock className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold">パスワードの変更</p>
                                        <p className="text-sm mt-0.5">ヘッダー右上の自分の名前をクリックし「プロフィール」から、現在のアカウントのパスワードを変更できます。定期的な変更をおすすめします。</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <h4 className="font-bold text-slate-800 mb-2">管理者専用の各種設定</h4>
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <Users className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold">従業員管理</p>
                                            <p className="text-sm mt-0.5">新規職員の追加、退職者の削除、名前の変更、並び順（表示順）の変更を行えます。また、職員がパスワードを忘れた場合、ここで「仮パスワードを発行」してリセットが可能です。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <CalendarClock className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold">AMタスクリスト設定</p>
                                            <p className="text-sm mt-0.5">AMスケジュールで割り当てる「業務の種類」を追加・編集します。業務ごとに色を変更したり、「自動振り分けの対象外」にする設定などが可能です。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <QrCode className="h-4 w-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold">QRコード設定</p>
                                            <p className="text-sm mt-0.5">カレンダーを紙に印刷した際、右上に配置されるQRコードの飛び先（スマホ用カレンダーURLなど）を自由に設定できます。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="text-center text-slate-400 text-sm py-8 border-t border-slate-100 mt-8">
                &copy; シフト管理システム - 使い方ガイド
            </div>
        </div>
    );
}
