'use strict';

const notifier = require('./Notifier')
const $logger = require('./Logger')

const adRepository = require('../repositories/adRepository.js')

class Ad {

    constructor(ad) {
        this.id         = ad.id
        this.url        = ad.url
        this.title      = ad.title
        this.searchTerm = ad.searchTerm
        this.price      = ad.price
        this.valid      = false
        this.saved      = null,
        this.notify     = ad.notify
    }

    process = async () => {

        if (!this.isValidAd()) {
            $logger.debug('Item invalido');
            return false
        }

        try {

            // check if this entry was already added to DB
            if (await this.alreadySaved()) {
                return this.checkPriceChange()
            }

            else {
                // create a new entry in the database
                return this.addToDataBase()
            }

        } catch (error) {
            $logger.error(error);
        }
    }

    alreadySaved = async () => {
        try {
            this.saved = await adRepository.getAd(this.id)
            return true
        } catch (error) {
            return false
        }
    }

    addToDataBase = async () => {

        try {
            await adRepository.createAd(this)
            $logger.info('Item ' + this.id + ' adicionado ao banco de dados.')
        }

        catch (error) {
            $logger.error(error)
        }

        if (this.notify) {
            try {
                const msg = 'Novo item encontrado!\n' + this.title + ' - R$' + this.price + '\n\n' + this.url
                notifier.sendNotification(msg, this.id)
            } catch (error) {
                $logger.error('Erro ao enviar notificação.')
            }
        }
    }

    updatePrice = async () => {
        $logger.info('updatePrice')

        try {
            await adRepository.updateAd(this)
        } catch (error) {
            $logger.error(error)
        }
    }

    checkPriceChange = async () => {

        if (this.price !== this.saved.price) {

            await this.updatePrice(this)

            // just send a notification if the price dropped
            if (this.price < this.saved.price) {

                $logger.info('Preço desse item foi reduzido: ' + this.url)

                const decreasePercentage = Math.abs(Math.round(((this.price - this.saved.price) / this.saved.price) * 100))

                const msg = 'Preço desse item caiu! ' + decreasePercentage + '% de desconto!\n' +
                    'De R$' + this.saved.price + ' para R$' + this.price + '\n\n' + this.url

                try {
                    await notifier.sendNotification(msg, this.id)
                } catch (error) {
                    $logger.error(error)
                }
            }
        }
    }

    // some elements found in the ads selection don't have an url
    // I supposed that OLX adds other content between the ads,
    // let's clean those empty ads
    isValidAd = () => {

        // Adicionei teste para verificar se o termo estah na URL para evitar buscar tambem na descricao
        if (!isNaN(this.price) && this.url && this.id && this.title.includes(this.searchTerm) ) {
            this.valid = true
            return true
        }
        else {
            this.valid = false
            return false
        }
    }
}

module.exports = Ad
