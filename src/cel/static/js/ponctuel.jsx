import {
    fetchAuth,
    getAPIBaseURL,
    SelectizeUtils,
} from 'Utils'

import {
    BootstrapTable,
    TableHeaderColumn,
} from 'react-bootstrap-table'
import 'node_modules/react-bootstrap-table/dist/react-bootstrap-table.min.css'
const {
    Input,
    RadioGroup,
    Row,
    Textarea,
} = FRC

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const HistoricalForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="historical-form"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

var Ponctuel = React.createClass({

    getInitialState() {
        return {
            beneficiaires: undefined,
            beneficiairesList: undefined,
            debit: undefined,
            debitList: undefined,
            debit: undefined,
            credit: undefined,
            amount: undefined,
            description: '',
            accountList: Array(),
        }
    },

    componentDidMount() {
        var computeBeneficiairesList = (data) => {
            var res = _.chain(data.results)
                .map(function(item){ return {label: item.cyclos_name, value:item.cyclos_id} })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({beneficiairesList: res})
        }
        fetchAuth(this.props.ponctuelListUrl, 'GET', computeBeneficiairesList)

        var computeDebitList = (data) => {
            debugger
            var res = _.chain(data.result)
                .map(function(item){ return {label: item.type.name, value:item.id} })
                .sortBy(function(item){ return item.label })
                .value()
            this.setState({debitList: res})
        }
        fetchAuth(getAPIBaseURL + "account-summary-adherents/", 'GET', computeDebitList)
    },

    beneficiairesOnValueChange(item) {
        if (item) {
            this.setState({beneficiaires: item})
        }
        else
            this.setState({beneficiaires: undefined})
    },

    debitOnValueChange(item) {
        if (item) {
            this.setState({debit: item})
        }
        else
            this.setState({debit: undefined})
    },

    render() {

        return (
            <div className="row">
                <div className="col-md-10 col-md-offset-1">
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-debit">
                            {__("Compte à débiter")}
                        </label>
                        <div className="col-sm-1"></div>
                        <div className="col-sm-4 virement-debit" data-eusko="virement-debit">
                            <SimpleSelect
                                ref="select"
                                value={this.state.debit}
                                options={this.state.debitList}
                                placeholder={__("Compte à créditer")}
                                theme="bootstrap3"
                                autocomplete="off"
                                onValueChange={this.debitOnValueChange}
                                renderValue={SelectizeUtils.selectizeRenderValue}
                                renderOption={SelectizeUtils.selectizeNewRenderOption}
                                required
                            >
                            </SimpleSelect>
                        </div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-credit">
                            {__("Compte bénéficiaire")}
                        </label>
                        <div className="col-sm-1"></div>
                        <div className="col-sm-4 virement-credit" data-eusko="virement-credit">
                            <SimpleSelect
                                ref="select"
                                value={this.state.beneficiaires}
                                options={this.state.beneficiairesList}
                                placeholder={__("Compte à créditer")}
                                theme="bootstrap3"
                                autocomplete="off"
                                onValueChange={this.beneficiairesOnValueChange}
                                renderValue={SelectizeUtils.selectizeRenderValue}
                                renderOption={SelectizeUtils.selectizeNewRenderOption}
                                required
                            >
                            </SimpleSelect>
                        </div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-amount">
                            {__("Montant")}
                        </label>
                        <div className="col-sm-5">
                            <HistoricalForm ref="historical-form">
                                <Input
                                    name="montant"
                                    data-eusko="virement-amount"
                                    onChange={this.amountOnValueChange}
                                    value = {this.state.amount}
                                />
                            </HistoricalForm>
                        </div>
                    </div>
                    <div className="form-group row">
                        <div className="col-sm-1"></div>
                        <label
                            className="control-label col-sm-2"
                            htmlFor="virement-description">
                            {__("Description")}
                        </label>
                        <div className="col-sm-5">
                            <HistoricalForm ref="historical-form">
                                <Input
                                    name="description"
                                    data-eusko="virement-description"
                                    onChange={this.descriptionOnValueChange}
                                    value = {this.state.description}
                                />
                            </HistoricalForm>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
})


ReactDOM.render(
    <Ponctuel ponctuelListUrl={getAPIBaseURL + "beneficiaires/"} />,
    document.getElementById('ponctuel')
)
document.title = __("Mes virements") + ": " + __("Virement ponctuel") + " - " + __("Compte en ligne") + " " + document.title