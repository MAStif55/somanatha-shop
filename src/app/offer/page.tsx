'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OfferPage() {
    const { locale } = useLanguage();

    return (
        <main className="min-h-screen bg-[#FAF9F6] flex flex-col">
            <Header />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-ornamental text-[#2D1B1F] mb-8 sm:mb-12 text-center">
                    {locale === 'ru' ? 'Публичная оферта' : 'Public Offer Agreement'}
                </h1>

                <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 prose prose-stone max-w-none text-[#444] text-sm sm:text-base">
                    {locale === 'ru' ? (
                        <>
                            {/* Russian Version */}
                            <p className="text-center font-bold text-lg mb-6">
                                ДОГОВОР ПУБЛИЧНОЙ ОФЕРТЫ<br />
                                о продаже товаров дистанционным способом
                            </p>

                            <p className="mb-8">
                                Настоящий текст является публичной офертой (предложением) Продавца, адресованной неопределенному кругу физических лиц, заключить договор купли-продажи Товара дистанционным способом на условиях, изложенных ниже.
                            </p>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ</h3>
                                <p>
                                    1.1. Продавец — Физическое лицо, применяющее специальный налоговый режим «Налог на профессиональный доход» (самозанятый), Трубицина Елена Андреевна.
                                </p>
                                <p>
                                    1.2. Покупатель — полностью дееспособное физическое лицо, размещающее Заказы на сайте Интернет-магазина, либо указанное в качестве получателя Товара, приобретающее Товар для личных, семейных, домашних и иных нужд, не связанных с осуществлением предпринимательской деятельности.
                                </p>
                                <p>
                                    1.3. Интернет-магазин — интернет-сайт, расположенный в сети Интернет по адресу: <a href="https://somanatha.ru" className="text-[#8B4513]">somanatha.ru</a>, посредством которого Продавец осуществляет торговлю.
                                </p>
                                <p>
                                    1.4. Товар — перечень материальных объектов, размещенный в Интернет-магазине и доступный для Заказа.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">2. ПРЕДМЕТ ДОГОВОРА</h3>
                                <p>
                                    2.1. Продавец обязуется передать в собственность Покупателю Товар, а Покупатель обязуется принять и оплатить Товар на условиях настоящего Договора.
                                </p>
                                <p>
                                    2.2. Информация о Товаре (наименование, цена, характеристики) представлена в Интернет-магазине.
                                </p>
                                <p>
                                    2.3. Важно: Сопровождающие Товар фотографии являются простыми иллюстрациями и могут незначительно отличаться от фактического внешнего вида Товара в силу особенностей цветопередачи различных устройств. Незначительные отличия элементов дизайна или оформления от заявленных в описании на сайте не являются неисправностью или нефункциональностью Товара.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">3. ПОРЯДОК ЗАКЛЮЧЕНИЯ ДОГОВОРА</h3>
                                <p>
                                    3.1. Текст данного Договора является публичной офертой (в соответствии со ст. 435 и ч. 2 ст. 437 ГК РФ).
                                </p>
                                <p>
                                    3.2. Акцептом (безусловным принятием) условий настоящей оферты считается факт оплаты Заказа Покупателем.
                                </p>
                                <p>
                                    3.3. Договор считается заключенным с момента выдачи (отправки) Продавцом Покупателю кассового чека (чека НПД) либо иного документа, подтверждающего оплату Товара.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">4. ЦЕНА И ПОРЯДОК ОПЛАТЫ</h3>
                                <p>
                                    4.1. Цена Товара указывается в Интернет-магазине в рублях РФ.
                                </p>
                                <p>
                                    4.2. Продавец имеет право в одностороннем порядке изменять цену на любой Товар до момента оформления и оплаты Заказа Покупателем. После оплаты Заказа цена изменению не подлежит.
                                </p>
                                <p>
                                    4.3. Оплата Товара производится на условиях 100% предоплаты безналичным расчетом способами, указанными на сайте.
                                </p>
                                <p>
                                    4.4. Обязательство Покупателя по оплате считается исполненным с момента поступления денежных средств на счет Продавца.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">5. ДОСТАВКА И ПЕРЕДАЧА ТОВАРА</h3>
                                <p>
                                    5.1. Способы, сроки и стоимость доставки Товара указываются на сайте при оформлении Заказа. Стоимость доставки оплачивается Покупателем отдельно, если иное прямо не указано при оформлении Заказа.
                                </p>
                                <p>
                                    5.2. Обязанность Продавца передать Товар Покупателю считается исполненной в момент сдачи Товара в организацию связи (транспортную компанию, курьерскую службу) для доставки Покупателю.
                                </p>
                                <p>
                                    5.3. Риск случайной гибели или случайного повреждения Товара переходит к Покупателю с момента передачи Товара первому перевозчику (почтовой или курьерской службе). Продавец не несет ответственности за действия служб доставки (задержки, утерю, повреждение упаковки).
                                </p>
                                <p>
                                    5.4. При получении Заказа Покупатель обязан осмотреть посылку на предмет целостности упаковки. В случае обнаружения повреждений Покупатель обязан составить акт с представителем службы доставки.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">6. ВОЗВРАТ ТОВАРА И ДЕНЕЖНЫХ СРЕДСТВ</h3>
                                <p className="font-semibold mt-4">6.1. Товар надлежащего качества:</p>
                                <p>
                                    6.1.1. Покупатель вправе отказаться от Товара в любое время до его передачи, а после передачи Товара — в течение 7 (семи) дней.
                                </p>
                                <p>
                                    6.1.2. Возврат Товара надлежащего качества возможен в случае, если сохранены его товарный вид, потребительские свойства, а также документ, подтверждающий факт покупки. Нарушение целостности упаковки, следы эксплуатации, срезанные бирки являются основанием для отказа в возврате.
                                </p>
                                <p>
                                    6.1.3. При отказе Покупателя от Товара Продавец возвращает ему денежную сумму, уплаченную по договору, за исключением расходов Продавца на доставку от Покупателя возвращенного товара, не позднее чем через 10 дней со дня предъявления Покупателем соответствующего требования и поступления возвращаемого Товара на склад Продавца.
                                </p>
                                <p className="font-semibold mt-4">6.2. Товар, не подлежащий возврату:</p>
                                <p>
                                    6.2.1. Покупатель не вправе отказаться от Товара надлежащего качества, имеющего индивидуально-определенные свойства, если указанный Товар может быть использован исключительно приобретающим его Покупателем (товары, изготовленные на заказ, по индивидуальным меркам, с персонализацией и т.д.).
                                </p>
                                <p className="font-semibold mt-4">6.3. Товар ненадлежащего качества:</p>
                                <p>
                                    6.3.1. Под товаром ненадлежащего качества подразумевается товар, который неисправен и не может обеспечить исполнение своих функциональных качеств. Отличие элементов дизайна или оформления от заявленных в описании на сайте не является признаком некачественности или нефункциональности Товара.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">7. ОТВЕТСТВЕННОСТЬ СТОРОН И ФОРС-МАЖОР</h3>
                                <p>
                                    7.1. Стороны освобождаются от ответственности за неисполнение или ненадлежащее исполнение обязательств, если это вызвано действиями непреодолимой силы (форс-мажор), включая: действия органов государственной власти, пожар, наводнение, землетрясение, другие стихийные бедствия, отсутствие электроэнергии и/или сбои работы компьютерной сети, забастовки, гражданские волнения, беспорядки.
                                </p>
                                <p>
                                    7.2. Продавец не несет ответственности за ущерб, причиненный Покупателю вследствие ненадлежащего использования Товаров, приобретенных в Интернет-магазине.
                                </p>
                                <p>
                                    7.3. Совокупная ответственность Продавца по Договору, по любому иску или претензии в отношении Договора или его исполнения, ограничивается суммой платежа, уплаченного Покупателем Продавцу по данному Договору. Упущенная выгода возмещению не подлежит.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">8. ПЕРСОНАЛЬНЫЕ ДАННЫЕ</h3>
                                <p>
                                    8.1. Акцептуя Оферту, Покупатель дает согласие на обработку своих персональных данных (ФИО, телефон, адрес, e-mail) в целях исполнения настоящего Договора (включая передачу данных службам доставки для осуществления отправки).
                                </p>
                                <p>
                                    8.2. Продавец обеспечивает конфиденциальность персональных данных в соответствии с ФЗ № 152 «О персональных данных».
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">9. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ</h3>
                                <p>
                                    9.1. Все споры и разногласия решаются путем переговоров.
                                </p>
                                <p>
                                    9.2. Претензионный порядок обязателен. Срок рассмотрения письменной претензии — 10 (десять) календарных дней с момента получения.
                                </p>
                                <p>
                                    9.3. В случае невозможности достижения соглашения спор передается на рассмотрение в суд в соответствии с действующим законодательством РФ.
                                </p>
                            </section>

                            {/* Seller Details Block */}
                            <div className="mt-12 pt-8 border-t-2 border-[#C9A227]/30">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">10. РЕКВИЗИТЫ ПРОДАВЦА</h3>
                                <div className="bg-[#FAF9F6] p-4 sm:p-6 rounded-lg border border-gray-200">
                                    <p className="mb-2">
                                        <strong>Статус:</strong> Физическое лицо, применяющее специальный налоговый режим «Налог на профессиональный доход»
                                    </p>
                                    <p className="mb-2">
                                        <strong>ФИО:</strong> Трубицина Елена Андреевна
                                    </p>
                                    <p className="mb-2">
                                        <strong>ИНН:</strong> 550617866892
                                    </p>
                                    <p>
                                        <strong>Сайт:</strong> <a href="https://somanatha.ru" className="text-[#8B4513]">somanatha.ru</a>
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* English Version */}
                            <p className="text-center font-bold text-lg mb-6">
                                PUBLIC OFFER AGREEMENT<br />
                                for the sale of goods by remote means
                            </p>

                            <p className="text-sm text-gray-500 mb-8 text-center">
                                Moscow<br />
                                Publication date: January 31, 2026
                            </p>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">1. GENERAL PROVISIONS</h3>
                                <p>
                                    1.1. An Individual Entrepreneur applying the special tax regime "Tax on Professional Income" (hereinafter referred to as the "Seller") publishes this public offer for the sale of goods by remote means through the online store located at: <a href="https://somanatha-shop.web.app" className="text-[#8B4513]">somanatha-shop.web.app</a> (hereinafter referred to as the "Online Store").
                                </p>
                                <p>
                                    1.2. This agreement is an official proposal (public offer) of the Seller, addressed to any individual (hereinafter referred to as the "Buyer"), and contains all essential terms of the retail purchase and sale agreement for goods by remote means.
                                </p>
                                <p>
                                    1.3. In accordance with Article 437 of the Civil Code of the Russian Federation, this document is a public offer.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">2. SUBJECT OF THE AGREEMENT</h3>
                                <p>
                                    2.1. The Seller undertakes to transfer to the Buyer ownership of goods presented in the Online Store catalog, and the Buyer undertakes to pay for and accept the specified goods under the terms of this agreement.
                                </p>
                                <p>
                                    2.2. The name, quantity, assortment, and price of goods are determined based on information posted in the Online Store and confirmed by the Buyer when placing an order.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">3. MOMENT OF CONTRACT CONCLUSION (ACCEPTANCE)</h3>
                                <p>
                                    3.1. The contract is considered concluded from the moment of payment by the Buyer for the order (full or partial prepayment).
                                </p>
                                <p>
                                    3.2. The fact of payment for the order is an unconditional acceptance by the Buyer of the terms of this public offer.
                                </p>
                                <p>
                                    3.3. By placing and paying for an order, the Buyer confirms that they have read the terms of this agreement and accept them in full.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">4. PAYMENT AND DELIVERY</h3>
                                <p>
                                    4.1. Prices for goods are indicated in Russian rubles and include all applicable taxes.
                                </p>
                                <p>
                                    4.2. Payment is made by any of the methods offered in the Online Store at the time of ordering.
                                </p>
                                <p>
                                    4.3. Delivery of goods is carried out in the manner and within the time frame agreed upon when placing the order. Delivery costs are indicated separately.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">5. RETURN OF GOODS</h3>
                                <p>
                                    5.1. In accordance with Article 26.1 of the Law of the Russian Federation "On Consumer Rights Protection", the Buyer has the right to refuse goods of proper quality within <strong>7 (seven) days</strong> from the moment of receiving the goods.
                                </p>
                                <p>
                                    5.2. Return of goods of proper quality is possible under the following conditions:
                                </p>
                                <ul className="list-disc pl-6 mt-2">
                                    <li>the appearance and consumer properties of the goods are preserved;</li>
                                    <li>there is a document confirming the fact and conditions of purchase.</li>
                                </ul>
                                <p className="mt-4">
                                    5.3. Refund is made within 10 (ten) days from the moment the Seller receives the goods and the return application.
                                </p>
                                <p>
                                    5.4. Return of goods of improper quality is carried out in accordance with the legislation of the Russian Federation.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">6. PERSONAL DATA</h3>
                                <p>
                                    6.1. The Buyer's personal data (name, contact phone number, email address, delivery address) is used exclusively for order fulfillment and delivery of goods.
                                </p>
                                <p>
                                    6.2. The Seller undertakes not to transfer the Buyer's personal data to third parties, except in cases necessary for order fulfillment (transfer of data to the delivery service).
                                </p>
                                <p>
                                    6.3. By placing an order, the Buyer consents to the processing of their personal data for the specified purposes.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">7. LIABILITY OF THE PARTIES</h3>
                                <p>
                                    7.1. The parties are liable for non-fulfillment or improper fulfillment of their obligations under this agreement in accordance with the legislation of the Russian Federation.
                                </p>
                                <p>
                                    7.2. The Seller is not responsible for delivery delays caused by the actions of third parties (postal and courier services).
                                </p>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">8. FINAL PROVISIONS</h3>
                                <p>
                                    8.1. This agreement comes into force from the moment of its publication on the Online Store website and is valid until its cancellation or replacement with a new version.
                                </p>
                                <p>
                                    8.2. The Seller reserves the right to make changes to the terms of this offer. Changes come into effect from the moment of publication of the new version on the website.
                                </p>
                                <p>
                                    8.3. All disputes arising between the parties shall be resolved through negotiations. If agreement cannot be reached, disputes shall be considered in accordance with the legislation of the Russian Federation.
                                </p>
                            </section>

                            {/* Seller Details Block */}
                            <div className="mt-12 pt-8 border-t-2 border-[#C9A227]/30">
                                <h3 className="text-lg font-bold text-[#2D1B1F] mb-4">SELLER DETAILS</h3>
                                <div className="bg-[#FAF9F6] p-4 sm:p-6 rounded-lg border border-gray-200">
                                    <p className="mb-2">
                                        <strong>Status:</strong> Individual Entrepreneur applying the special tax regime "Tax on Professional Income"
                                    </p>
                                    <p className="mb-2">
                                        <strong>Full Name:</strong> Trubitsina Elena Andreevna
                                    </p>
                                    <p>
                                        <strong>TIN (INN):</strong> 550617866892
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Footer />
        </main>
    );
}
