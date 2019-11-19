import React, { useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useDropzone } from 'react-dropzone'

import { sampleLogs, sampleDeviceList } from './sample'

import './styles.css'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'

const getUniqueElements = arr => {
    const unique = []
    const names = []

    arr.forEach(x => {
        if (!names.includes(x.sortName)) {
            names.push(x.sortName)
            unique.push(x)
        }
    })

    return unique
}

const numberWithCommas = n => {
    const parts = n.toString().split('.')

    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    return parts.join('.')
}

const ResultsTable = ({ devices, total, groups = [] }) => {
    const hasData = groups.length > 0
    let runningTotal = 0

    return (
        <React.Fragment>
            {hasData ? (
                <p>
                    The main thing to look at is the last column. This represents the total percentage of
                    installations comprised by that device and all the ones above it combined. In other words, if you
                    scroll down to the row that shows 25 then all devices down through that row make up 25% of the
                    total installs.
                </p>
            ) : null}
            <table className="table table-hover table-sm table-striped table-bordered table-dark">
                <thead className="thead-dark">
                    <tr>
                        <th scope="row" className="text-center">
                            Rank
                        </th>
                        <th scope="row">Brand</th>
                        <th scope="row">Major Model</th>
                        <th scope="row" className="text-center">
                            Installs
                        </th>
                        <th scope="row" className="text-center">
                            Running total of installations
                        </th>
                        <th scope="row" className="text-warning text-center">
                            Running % of install base
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {hasData ? (
                        groups.map((group, g) => {
                            runningTotal += group.count

                            return (
                                <tr key={`${group.name}_${group.count}_${runningTotal}`}>
                                    <th scope="row" className="text-center">
                                        {g + 1}
                                    </th>
                                    <td>{group.brand}</td>
                                    <td>
                                        {getUniqueElements(
                                            group.codes.map(model => ({
                                                name: devices[model].name,
                                                sortName: devices[model].sortName,
                                            })),
                                        )
                                            .map(model => model.name)
                                            .join(', ')}
                                    </td>
                                    <td className="text-center">{numberWithCommas(group.count)}</td>
                                    <td className="text-center">{numberWithCommas(runningTotal)}</td>
                                    <td className="text-center text-warning font-weight-bold">
                                        {parseInt((runningTotal / total) * 100, 10)}
                                    </td>
                                </tr>
                            )
                        })
                    ) : (
                        <tr>
                            <td colSpan="6" className="text-center">
                                No data to display
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </React.Fragment>
    )
}

class App extends React.PureComponent {
    state = {
        data: window.location.href.includes('csb.app') ? sampleLogs : '',
        devices: window.location.href.includes('csb.app') ? sampleDeviceList : '',
    }

    onLogsChange = evt => {
        const newState = { ...this.state }

        this.setState({
            ...newState,
            data: (evt.target.value || '').trim(),
        })
    }

    onDevicesChange = evt => {
        const newState = { ...this.state }

        this.setState({
            ...newState,
            devices: (evt.target.value || '').trim(),
        })
    }

    DropLogs = () => {
        const onDrop = useCallback(acceptedFiles => {
            const reader = new FileReader()

            reader.onabort = () => console.log('[DropLogs] file reading was aborted')
            reader.onerror = () => console.log('[DropLogs] file reading has failed')
            reader.onload = () => {
                const newState = { ...this.state }

                this.setState({
                    ...newState,
                    data: reader.result.trim(),
                })
            }

            acceptedFiles.forEach(file => reader.readAsText(file))
        }, [])
        const { getRootProps } = useDropzone({ onDrop })

        return (
            <div {...{ ...getRootProps(), tabIndex: -1 }} className="col form-group">
                <label htmlFor="logsInput">
                    installs_com.example_YYYYMM_<strong>device</strong>.csv (installs by device)
                </label>
                <textarea
                    className="form-control"
                    id="logsInput"
                    onChange={this.onLogsChange}
                    value={this.state.data}
                    placeholder="Drag installs_com.example_YYYYMM_device.csv here"
                />
            </div>
        )
    }

    DropDevices = () => {
        const onDrop = useCallback(acceptedFiles => {
            const reader = new FileReader()

            reader.onabort = () => console.log('[DropDevices] file reading was aborted')
            reader.onerror = () => console.log('[DropDevices] file reading has failed')
            reader.onload = () => {
                const newState = { ...this.state }

                this.setState({
                    ...newState,
                    devices: reader.result.trim(),
                })
            }

            acceptedFiles.forEach(file => reader.readAsText(file))
        }, [])
        const { getRootProps } = useDropzone({ onDrop })

        return (
            <div {...{ ...getRootProps(), tabIndex: -1 }} className="col form-group">
                <label htmlFor="deviceInput">supported_devices.csv (list of all possible devices)</label>
                <textarea
                    className="form-control"
                    id="deviceInput"
                    onChange={this.onDevicesChange}
                    value={this.state.devices}
                    placeholder="Drag supported_devices.csv here"
                />
            </div>
        )
    }

    getDeviceList = rawDeviceList => {
        const devices = {}
        const groups = {}

        if (rawDeviceList) {
            rawDeviceList.split('\n').forEach(desc => {
                const [brand, name, code, model] = desc.split(',')

                if (!name) {
                    return
                }

                const sortName = name.replace(/\W+/g, '_').toLowerCase()

                if (!groups[sortName]) {
                    groups[sortName] = {
                        brand,
                        codes: [code],
                        count: 0,
                    }
                } else {
                    groups[sortName].codes = groups[sortName].codes.concat([code])
                }

                devices[code] = {
                    brand,
                    name,
                    sortName,
                    model,
                    code,
                    count: 0,
                }
            })
        }

        return { groups, devices }
    }

    /**
     * Group:
     * [codeName]: {
     *     codes: Array<String>,
     *     count: Number,
     * }
     *
     * Device:
     * [codeName]: {
     *     count: Number,
     *     brand: String,
     *     name: String,
     *     model: String,
     *     codeName: String,
     * }
     */

    getResults = (data, rawDeviceList) => {
        const { devices, groups: groupsObj } = this.getDeviceList(rawDeviceList)
        let total = 0

        if (!data) {
            return { devices, total, groups: groupsObj }
        }

        // Reset the counts (why?)
        for (let device in devices) {
            if (devices.hasOwnProperty(device)) {
                devices[device].count = 0
            }
        }

        // Parse
        data.split('\n').forEach(entry => {
            const parts = entry.split(',')
            const code = parts[2]
            const installs = parts[9]

            // Ignore header row in CSV
            if (isNaN(installs)) {
                return
            }

            const numInstalls = parseInt(installs, 10)

            if (devices[code]) {
                devices[code].count += numInstalls
            } else {
                devices[code] = {
                    brand: 'Unknown',
                    name: 'Unknown',
                    sortName: 'Unknown',
                    model: 'Unknown',
                    count: numInstalls,
                }
            }

            total += numInstalls
        })

        // Reset the counts (why?)
        for (let group in groupsObj) {
            if (groupsObj.hasOwnProperty(group)) {
                groupsObj[group].count = 0
            }
        }

        // Loop through devices, then increment its group's count
        for (let d in devices) {
            if (devices.hasOwnProperty(d)) {
                const device = devices[d]

                if (groupsObj[device.sortName]) {
                    groupsObj[device.sortName].count += device.count
                }
            }
        }

        // Convert groups to array
        let groups = []

        for (let group in groupsObj) {
            // We need to filter by count because the list includes all possible devices, not just ones we've seen
            if (groupsObj.hasOwnProperty(group) && groupsObj[group].count > 0) {
                groups.push({
                    ...groupsObj[group],
                })
            }
        }

        // Filter and sort
        groups = groups.sort((a, b) => {
            if (a.count > b.count) {
                return -1
            }

            if (a.count < b.count) {
                return 1
            }

            return 0
        })

        return { devices, total, groups }
    }

    render() {
        const { devices, total, groups } = this.getResults(this.state.data, this.state.devices)

        return (
            <div className="App">
                <h1>Top Android Devices</h1>
                <div className="row">
                    <div className="col">
                        <p>Prints the top Android devices by installations from your Google Play Store logs.</p>
                    </div>
                </div>
                <h2>Input logs</h2>
                <div className="row">
                    <div className="col">
                        <p>Drag-and-drop or copy-and-paste your raw .csv data here</p>
                    </div>
                </div>
                <div className="row">
                    <this.DropLogs>
                        <p>Drag onto me?</p>
                    </this.DropLogs>
                </div>
                <div className="row">
                    <this.DropDevices>
                        <p>Drag onto me?</p>
                    </this.DropDevices>
                </div>

                <h2>Results</h2>
                <ResultsTable groups={groups} devices={devices} total={total} />
                <p>
                    <a href="https://github.com/patik/android-device-list">GitHub repository</a>
                </p>
            </div>
        )
    }
}

const rootElement = document.getElementById('root')

ReactDOM.render(<App />, rootElement)
